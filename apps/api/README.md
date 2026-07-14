# Workestrator API

This backend lives inside the Workestrator monorepo at `apps/api`.

Use the monorepo root for shared documentation and CI, and use this folder for Gradle/Kotlin work:

```bash
gradlew.bat bootRun
gradlew.bat build
gradlew.bat test
```

Production-ready REST API template built with Kotlin + Spring Boot 3.5. Includes authentication, user management, structured logging, error tracking, file storage, email, and knowledge embeddings — all pre-wired so you can focus on your domain.

## Stack

| Layer | Technology |
|---|---|
| Language | Kotlin 2.2 / Java 21 |
| Framework | Spring Boot 3.5 |
| Security | Spring Security + Cookie/Bearer + Google OAuth2 |
| Database | PostgreSQL + Spring Data JPA (Hibernate) |
| API Docs | SpringDoc OpenAPI 3 (Swagger UI) |
| Storage | Cloudflare R2 (S3-compatible) |
| Email | SMTP via Hostinger |
| AI embeddings | Voyage/OpenAI-compatible HTTP APIs |
| Push | Firebase Admin SDK |
| Error tracking | Sentry |
| Log shipping | Better Stack (Logtail) |
| Build | Gradle (Kotlin DSL) |

## Architecture

Feature-oriented vertical slices. Business code lives under `features/`, shared infrastructure under `shared/`.

```
com.apibot/
├── features/
│   ├── auth/          # Login, register, password recovery, Google OAuth2
│   ├── user/          # User CRUD, activation/deactivation, avatar upload
│   └── health/        # Health check endpoint
├── security/          # @GetUserId annotation + resolver
└── shared/
    ├── config/        # SecurityConfig, CORS, Auth, Mail, Firebase, Sentry
    ├── constants/
    ├── exceptions/    # ApiExceptionHandler + canonical exception types
    ├── extensions/    # AuthenticatedPrincipal, Pagination, UserAccessScope
    ├── media/         # Cloudflare R2 upload service
    ├── security/      # CurrentUserProvider
    └── service/       # EmailService
```

Each feature follows this internal structure:

```
features/<name>/
├── controller/        # @RestController — delegates to service, no business logic
├── service/           # @Service — business logic
│   └── integration/   # External calls (mail, AI, push, etc.)
├── repository/        # 3-layer: port interface + JpaRepository + @Primary adapter
├── model/             # Domain data class + JPA *Entity + toDomain()/toEntity()
├── dto/               # *Request / *Response DTOs
└── domain/exception/  # Feature-specific exceptions (optional)
```

## Features included

- **Auth** — email/password login, registration, logout, forgot/reset password with email code, Google OAuth2, HTTP-only cookie sessions + Bearer token support
- **User management** — CRUD with pagination, filters, activation/deactivation, avatar upload
- **Request tracing** — every request gets a `X-Trace-Id` header and `traceId` + `userId` in MDC
- **Structured logging** — human-readable in dev, JSON in prod (stdout + rotating file + Better Stack)
- **Error tracking** — Sentry captures all exceptions with user context (userId, email, request)
- **Pagination** — shared `PageRequestParams` / `PageResult<T>` used across all paginated endpoints
- **Exception handling** — centralized `ApiExceptionHandler` with 6 semantic exception types
- **i18n error messages** — `{messageKey}` in exceptions resolved from `messages_pt/en.properties`
- **Email templates** — HTML templates with `{{variable}}` interpolation (welcome, verification, password recovery)
- **File storage** — Cloudflare R2 via AWS SDK S3, toggled with `app.storage.cloudflare.enabled`
- **Knowledge embeddings** — Voyage provider configured by default, with optional OpenAI embedding key
- **Firebase** — Admin SDK for push notifications and storage
- **Swagger UI** — auto-generated at `/swagger-ui.html`
- **Docker** — `Dockerfile` included, ready for VPS or container deploy

## Quick start

```bash
# 1. From the monorepo root
cd apps/api

# 2. Copy and fill environment variables
cp .env.example .env
# Edit .env with your database, email, OAuth2, etc.

# 3. Run on Windows
gradlew.bat bootRun

# Or run on bash/Unix shells
# ./gradlew bootRun
```

Swagger UI: http://localhost:8080/swagger-ui.html

## Environment variables

Copy `.env.example` to `.env` and fill in the required values.

### Required

| Variable | Description |
|---|---|
| `DB_URL` | PostgreSQL JDBC URL (`jdbc:postgresql://host:5432/dbname`) |
| `DB_USERNAME` | Database user |
| `DB_PASSWORD` | Database password |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret |
| `MAIL_USERNAME` | SMTP username |
| `MAIL_PASSWORD` | SMTP password |
| `APP_MAIL_FROM_EMAIL` | Email sender address |
| `SECRETS_MASTER_KEY` | Base64 AES-256 master key for encrypted app secrets |

### Optional

| Variable | Default | Description |
|---|---|---|
| `APP_AUTH_GOOGLE_SUCCESS_REDIRECT` | `http://localhost:5173/auth/google/success` | Redirect after Google login |
| `APP_AUTH_PASSWORD_RESET_BASE_URL` | `http://localhost:5173/reset-password` | Frontend URL for password reset |
| `APP_AUTH_ALLOWED_REDIRECT_HOSTS` | `localhost,127.0.0.1` | Hosts accepted for auth redirects |
| `APP_CORS_ALLOWED_ORIGIN_PATTERNS` | Production and local web URLs | CORS allowed origins |
| `APP_MAIL_FROM_NAME` | `no-reply` | Email sender display name |
| `MAIL_HOST` | `smtp.hostinger.com` | SMTP host |
| `MAIL_PORT` | `587` | SMTP port |
| `VOYAGE_API_KEY` | _(empty)_ | Voyage embeddings API key |
| `OPENAI_API_KEY` | _(empty)_ | OpenAI embeddings API key when using OpenAI |

### Optional storage and integrations

Cloudflare R2 storage is disabled by default. If `app.storage.cloudflare.enabled` is turned on, provide:

| Variable | Description |
|---|---|
| `APP_STORAGE_CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `APP_STORAGE_CLOUDFLARE_ACCESS_KEY_ID` | R2 access key |
| `APP_STORAGE_CLOUDFLARE_SECRET_ACCESS_KEY` | R2 secret access key |
| `APP_STORAGE_CLOUDFLARE_BUCKET` | R2 bucket |
| `APP_STORAGE_CLOUDFLARE_PUBLIC_URL_BASE` | Public URL base |

Firebase is optional. Provide `FIREBASE_SERVICE_ACCOUNT_BASE64` only when Firebase integrations are enabled.

### Observability (production)

| Variable | Description |
|---|---|
| `SENTRY_DSN` | Sentry project DSN; empty disables Sentry |
| `BETTERSTACK_SOURCE_TOKEN` | Better Stack log source token |
| `SPRING_PROFILES_ACTIVE` | Set to `prod` to enable JSON logging and Better Stack shipping |

## API endpoints

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Login with email/password |
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/logout` | Invalidate session |
| `POST` | `/auth/forgot-password` | Send password reset code |
| `POST` | `/auth/reset-password` | Reset password with code |
| `GET` | `/auth/me` | Current authenticated user |

### Users

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/users` | List users (paginated, filterable) |
| `POST` | `/users` | Create user |
| `GET` | `/users/{id}` | Get user by ID |
| `PUT` | `/users/{id}` | Update user |
| `DELETE` | `/users/{id}` | Delete user |
| `POST` | `/users/{id}/activate` | Activate user |
| `POST` | `/users/{id}/deactivate` | Deactivate user |
| `POST` | `/users/{id}/avatar` | Upload avatar |

Available filters on `GET /users`: `name`, `email`, `isActive`, `search`, `sortBy`, `sortDesc`.

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |

## Observability

### Sentry (error tracking)

Every unhandled exception is automatically captured with full context: stack trace, authenticated user (userId + email), HTTP request details, and environment.

Setup:
1. Create a project at [sentry.io](https://sentry.io)
2. Set `SENTRY_DSN` in your environment

### Better Stack (log management)

In production (`SPRING_PROFILES_ACTIVE=prod`), all logs are emitted as structured JSON and shipped to Better Stack in real time. Each log entry includes `traceId` and `userId` as top-level fields.

Setup:
1. Create a Java log source at [betterstack.com](https://betterstack.com)
2. Set `BETTERSTACK_SOURCE_TOKEN` in your environment
3. Create the log directory on your VPS: `sudo mkdir -p /var/log/app && sudo chown $USER /var/log/app`

### Request tracing

Every request receives a `X-Trace-Id` response header. The trace ID is propagated through MDC so it appears in all log lines for that request. Clients can also send a custom `X-Trace-Id` header to correlate frontend and backend logs.

## Adding a new feature

Use the scaffold agent for AI-assisted generation of the full feature skeleton:

```
Read .agents/agents/scaffold.md and scaffold a new feature called <name>
```

This generates: controller, service, 3-layer repository, DTOs, domain model + JPA entity, and mapping extension functions — all following the project conventions.

For manual implementation, refer to the skill files under `.agents/skills/`.

## Exception handling

Throw semantic exceptions from `shared/exceptions/` — never return manual `ResponseEntity` from services:

| Exception | HTTP status |
|---|---|
| `UnauthorizedException` | 401 |
| `ForbiddenException` | 403 |
| `ResourceNotFoundException` | 404 |
| `ConflictException` | 409 |
| `BusinessRuleViolationException` | 422 |
| `ServiceUnavailableException` | 503 |

To use i18n messages, wrap the key in braces: `throw ResourceNotFoundException("{user.not_found}")`. The message is resolved from `messages_pt.properties` or `messages_en.properties` based on the `?lang=` query param.

## Deploy

The template ships with a `Dockerfile`. The GitHub Actions workflow in `.github/workflows/deploy.yml` builds the image, pushes to Docker Hub, and deploys to a VPS via SSH.

Required GitHub secrets for the CD pipeline:

| Secret | Description |
|---|---|
| `DOCKER_USER` | Docker Hub username |
| `DOCKER_TOKEN` | Docker Hub access token |
| `VPS_HOST` | VPS IP or hostname |
| `VPS_USER` | SSH user |
| `VPS_SSH_KEY` | Private SSH key |
| `DB_URL_PROD` | Production database URL |
| `DB_USERNAME_PROD` | Production database user |
| `DB_PASSWORD_PROD` | Production database password |

## AI agents and skills

The `.agents/` directory contains machine-readable conventions used by Claude Code:

| Path | Purpose |
|---|---|
| `.agents/agents/scaffold.md` | Generates full feature skeletons |
| `.agents/agents/review.md` | Code review checklist |
| `.agents/agents/testing.md` | Test generation |
| `.agents/skills/architecture/` | Package layout and naming rules |
| `.agents/skills/controller/` | Controller conventions |
| `.agents/skills/service/` | Service conventions |
| `.agents/skills/repository/` | 3-layer repository pattern |
| `.agents/skills/dto-entity/` | DTO and JPA entity patterns |
| `.agents/skills/exceptions/` | Exception handling rules |
| `.agents/skills/observability/` | Sentry + Better Stack setup |
| `.agents/skills/pagination/` | Pagination conventions |
| `.agents/skills/auth/` | Auth flows and filters |

See `CLAUDE.md` for the full architecture reference.
