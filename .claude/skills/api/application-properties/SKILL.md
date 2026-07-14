---
name: application-properties
description: Configuration rules for application.properties, environment variables, .env loading and @ConfigurationProperties classes. Use when adding, moving, or reviewing any property, when wiring a typed config bean, or when introducing a secret/credential.
---

# Application Properties

The project uses `src/main/resources/application.properties` as the single source for runtime configuration. Secrets come from environment variables — never inline. In dev, env vars are loaded from a `.env` file at the project root via the `spring-dotenv` library; in prod (Render, Docker), real env vars take precedence over `.env` automatically.

## File layout

`application.properties` is organized in clearly labelled sections, in this order:

```
# ============ Application ============
# ============ Database ===============
# ============ JPA / Hibernate ========
# ============ Auth ===================
# ============ CORS ===================
# ============ OAuth2 (Google) ========
# ============ Mail ===================
# ============ AI (Anthropic) =========
# ============ Storage (Cloudflare R2) =
# ============ Firebase ===============
# ============ Feature flags / Domain =
# ============ Server / Servlet =======
# ============ Logging ================
# ============ DevTools / Springdoc ===
```

Keep one blank line between sections. Inside a section, sort keys alphabetically when no logical order applies.

## Property keys

- Spring built-ins: keep their original prefix (`spring.datasource.*`, `spring.mail.*`, `spring.security.oauth2.*`, `spring.jpa.*`, `logging.*`, `server.*`, `springdoc.*`)
- Project-specific: prefix with `app.<feature>.*` (e.g. `app.auth.cookie-name`, `app.feed.media.max-image-size-mb`, `app.storage.cloudflare.bucket`)
- Use **kebab-case** in property keys (`cookie-max-age`, not `cookieMaxAge` or `cookie_max_age`)

## Secrets — never inline

```properties
# ❌ NEVER do this — secret stays in git history forever
spring.datasource.password=${DB_PASSWORD:supersecret}

# ❌ NEVER do this — same problem
spring.datasource.password=supersecret

# ✅ Required env var, no fallback
spring.datasource.password=${DB_PASSWORD}

# ✅ Optional env var with a non-secret default
app.auth.cookie-name=${APP_AUTH_COOKIE_NAME:AUTH_TOKEN}
```

Rule of thumb: if leaking the default would be a security incident, the value is a **secret** — no default allowed.

Sensitive keys (always env-only, no inline default):
- `DB_PASSWORD`, `DB_USERNAME`, `DB_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `ANTHROPIC_API_KEY`
- `MAIL_PASSWORD`
- `CLOUDFLARE_*_KEY`, `CLOUDFLARE_ACCOUNT_ID`
- `FIREBASE_SERVICE_ACCOUNT_BASE64`

## .env file (dev only)

The project root holds two files:

- `.env` — gitignored, real secrets for local dev
- `.env.example` — committed, template with empty values, kept in sync key-for-key with `.env`

`.env` is loaded automatically by `spring-dotenv` (added to `build.gradle.kts`). The lookup order is:
1. JVM `-D` flags
2. OS environment variables
3. `.env` at project root
4. `application.properties` defaults (`${VAR:default}`)

So in production you never set a `.env` — the platform's env vars take over.

```env
# .env — example (use real values)
DB_URL=jdbc:postgresql://localhost:5432/gainz_dev
DB_USERNAME=admin
DB_PASSWORD=devpassword
ANTHROPIC_API_KEY=sk-ant-...
```

When adding a new secret:
1. Add it to `.env.example` with an empty value
2. Add the real value to your local `.env`
3. Reference it in `application.properties` via `${VAR}` (no default)
4. Document the variable in `CLAUDE.md` if it is required to boot

## Typed configuration — @ConfigurationProperties

Anything beyond a single value lives in a typed bean under `shared/config/` or `features/<feature>/config/`:

```kotlin
@ConfigurationProperties(prefix = "app.auth")
data class AuthProperties(
    val cookieName: String,
    val cookieMaxAge: Long,
    val sessionDurationHours: Long,
    val secureCookie: Boolean,
    val sameSite: String,
    val googleSuccessRedirect: String,
    val passwordResetBaseUrl: String,
    val allowedRedirectHosts: List<String>,
    val allowTokenInQueryRedirect: Boolean,
)
```

- `data class` with `val`s
- Property names in camelCase — Spring relaxed-binding maps `app.auth.cookie-name` → `cookieName`
- Lists with comma-separated values map to `List<String>` automatically

Register with `@EnableConfigurationProperties(AuthProperties::class)` on a `@Configuration` class, or annotate the data class with `@ConfigurationProperties` + `@ConfigurationPropertiesScan` once at the application level.

Inject like any bean:

```kotlin
@Service
class LoginService(private val authProperties: AuthProperties) { ... }
```

Rule: when a feature reads more than 2 properties, create a `*Properties` class. Never `@Value("\${...}")` more than 2 times in the same class.

## Profiles

The project does not currently use Spring profiles. If profiles are introduced (`application-prod.properties`, `application-dev.properties`):

- Keep secrets out of every profile file — env vars only
- Profile files override `application.properties` for non-secret values
- Activate via `SPRING_PROFILES_ACTIVE=prod`

## Review heuristics

- A property value that looks like a real secret (long random string, `sk-...`, `GOCSPX-...`, base64 blob) → must come from env
- `${VAR:realSecretValue}` pattern → remove the default, the value belongs in `.env`
- Snake_case key (`cookie_max_age`) → switch to kebab-case (`cookie-max-age`)
- Property keys without a section header → reorganize into the existing sections
- A class with three or more `@Value` injections → migrate to `@ConfigurationProperties`
- New env var introduced but `.env.example` not updated → out of sync
- New env var that the app needs to boot but is undocumented in `CLAUDE.md` → add it
