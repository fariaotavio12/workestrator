---
name: auth
description: Authentication and authorization rules for this Spring Boot project. Use when implementing or reviewing protected endpoints, login/register flows, token handling, OAuth2 callback, role checks, or session management.
---

# Auth

Cookie-based sessions with `AUTH_TOKEN` (HttpOnly, 8h) plus Google OAuth2. Configuration lives in `shared/config/SecurityConfig.kt`. The `auth` feature owns the login/register/logout services and password recovery.

## Components

```
features/auth/
├── controller/                 # /auth endpoints
├── service/                    # LoginService, RegisterService, ...
│   └── integration/            # AuthCookieFactory, EmailVerificationCodeService
├── repository/                 # UserAccount + UserSession + PasswordResetToken
├── model/                      # Domain + entity + mapping
├── dto/                        # AuthResponse, LoginRequest, ...
└── domain/exception/           # InvalidCredentialsException

security/
├── GetUserId.kt                # @GetUserId annotation
└── GetUserIdResolver.kt        # parameter resolver

shared/config/
├── SecurityConfig.kt           # filter chain, OAuth2, CSRF off
└── AuthProperties.kt           # cookie name, secure, sameSite
shared/extensions/
├── AuthenticatedPrincipal.kt
├── AuthenticationPrincipalResolver.kt
└── UserAccessScope.kt
```

## Resolving the current user

Two resolvers are available:

```kotlin
// Just the user id as String (UUID)
@GetMapping
fun list(@GetUserId userId: String): ResponseEntity<...> = ...

// Full principal (id, email, role, companyId)
@GetMapping
fun me(authentication: Authentication): CurrentUserResponse {
    val principal = authenticationPrincipalResolver.resolve(authentication)
    return ...
}
```

Prefer `@GetUserId` for plain CRUD endpoints. Use the resolver only when role/email/companyId is needed.

## Cookie + bearer token

`AuthCookieFactory` (in `features/auth/service/integration/`) builds:

```kotlin
authCookieFactory.create(token)  // Set-Cookie: AUTH_TOKEN=...; HttpOnly; ...
authCookieFactory.clear()        // Set-Cookie: AUTH_TOKEN=; Max-Age=0; ...
```

Login/register endpoints set the cookie on `HttpServletResponse` AND return the bearer token in the JSON body:

```kotlin
response.addHeader(HttpHeaders.SET_COOKIE, authCookieFactory.create(session.token).toString())
return ResponseEntity.ok(AuthResponse(token = session.token, ...))
```

Clients can use either the cookie (web) or the bearer token (mobile).

## OAuth2 (Google)

Two endpoints:

- `GET /auth/google/url?redirectUrl=…` — returns the URL the client should open
- `GET /auth/google/login?redirectUrl=…` — server-side redirect to `/oauth2/authorization/google`

The OAuth2 success handler (configured in `SecurityConfig`) creates or finds the user, issues a session, and redirects back to `redirectUrl` with the token. Client controls the redirect target — never hardcoded.

## Logout

```kotlin
@PostMapping("/logout")
@SecurityRequirement(name = "Bearer")
fun logout(request: HttpServletRequest, response: HttpServletResponse): ResponseEntity<Void> {
    sessionLookupService.logout(token)
    response.addHeader(HttpHeaders.SET_COOKIE, authCookieFactory.clear().toString())
    return ResponseEntity.noContent().build()
}
```

Always:
1. Invalidate the session record server-side (`UserSession`)
2. Clear `AUTH_TOKEN` cookie
3. Clear `JSESSIONID` cookie (because Spring may have issued one during OAuth2)

## Role-based access

Role checks live in services using `UserAccessScope`:

```kotlin
if (!UserAccessScope.canManageCompany(user, companyId))
    throw ForbiddenException("Insufficient permissions")
```

Never check roles inside the controller — keep that logic at the service boundary.

## Adding a protected endpoint

1. Annotate the controller method with `@SecurityRequirement(name = "Bearer")` (Swagger only — Security is enforced by `SecurityConfig`)
2. Use `@GetUserId` or `@AuthenticatedPrincipal` to read the caller
3. Call the service, which validates ownership/role

## Adding a public endpoint

1. Add the route to the `permitAll()` list in `SecurityConfig.securityFilterChain(...)`
2. Skip `@SecurityRequirement` on the method
3. Health endpoints (`/health/**`) and `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password` are already public

## Password recovery

`PasswordRecoveryService` issues a code via `EmailVerificationCodeService` and stores a `PasswordResetToken`. Reset endpoint validates code + new password and rotates the user's secret. The recovery flow does not log the user in — they must call `/auth/login` afterwards.

## Rules

- Never read user id from the request body or query string for an authenticated route
- Never trust an `X-User-Id` header
- Never hand-craft cookie strings — always go through `AuthCookieFactory`
- Never bypass the password hasher — use the `PasswordEncoder` bean
- Tokens are opaque strings — do not parse them client-side or in services other than `auth`

## Review heuristics

- Method takes both `@GetUserId` AND `Authentication` → pick one
- Cookie name spelled inline → use `authProperties.cookieName`
- A new endpoint accidentally public because no rule was added or the auth check was removed
- Role compared via plain string equality → use `UserAccessScope`
