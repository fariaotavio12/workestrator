# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This backend is now part of the Workestrator monorepo at `apps/api`. When working from the monorepo root, also read `../../CLAUDE.md` and `../../AGENTS.md`. Backend-specific root skills and agents are mirrored under `../../.claude/skills/api` and `../../.claude/agents/api`.

## Commands

```bash
# Run from apps/api on Windows
gradlew.bat bootRun
gradlew.bat test
gradlew.bat build

# Run (with bash/Unix shell)
./gradlew bootRun

# Tests
./gradlew test

# Build JAR
./gradlew build

# Docker
docker build -t workestrator-api .
```

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

**Known issue (sandboxed Claude Code environments):** `./gradlew compileKotlin`/`build`/`test` falha com
`java.io.IOException: Unable to establish loopback connection` — o Gradle Daemon tenta abrir uma porta
loopback pra IPC e o sandbox de rede bloqueia. Tentado com e sem `--no-daemon`, mesmo erro. Não é
relacionado ao código; é restrição do ambiente sandbox. Rode a build fora do sandbox (terminal normal)
antes de confiar em qualquer mudança Kotlin feita nesse tipo de sessão.

## Environment

The app boots from a `.env` file at the project root (loaded by `spring-dotenv`). Real OS env vars override `.env`, so production platforms (Render/Docker) keep working without it.

- `.env` — gitignored, holds local dev secrets
- `.env.example` — committed template, kept in sync key-for-key with `.env`

When introducing a new env variable: add to both files, reference via `${VAR}` in `application.properties`. See `.agents/skills/application-properties/SKILL.md` for the full convention.

## Auth Endpoints

| Método | Endpoint                | Descrição                    | Body                    |
| ------ | ----------------------- | ---------------------------- | ----------------------- |
| POST   | `/auth/login`           | Login com email/senha        | `LoginRequest`          |
| POST   | `/auth/register`        | Criar nova conta             | `RegisterRequest`       |
| POST   | `/auth/logout`          | Invalidar sessão             | —                       |
| POST   | `/auth/forgot-password` | Solicitar reset de senha     | `ForgotPasswordRequest` |
| POST   | `/auth/reset-password`  | Resetar senha com código     | `ResetPasswordRequest`  |
| GET    | `/auth/me`              | Dados do usuário autenticado | —                       |

**Response padrão** (login/register): `AuthResponse`

```json
{
	"userId": "uuid",
	"email": "user@example.com",
	"token": "bearer-token",
	"tokenExpiresAt": "2026-04-24T...",
	"message": "..."
}
```

## User Endpoints

| Método | Endpoint               | Descrição                   | Body                |
| ------ | ---------------------- | --------------------------- | ------------------- |
| GET    | `/users`               | Listar usuários (paginado)  | —                   |
| POST   | `/users`               | Criar usuário               | `CreateUserRequest` |
| GET    | `/users/{id}`          | Obter usuário               | —                   |
| PUT    | `/users/{id}`          | Atualizar usuário           | `UpdateUserRequest` |
| DELETE | `/users/{id}`          | Deletar usuário             | —                   |
| POST   | `/users/{id}/activate` | Ativar usuário              | —                   |
| POST   | `/users/{id}/deactivate` | Desativar usuário         | —                   |
| POST   | `/users/{id}/avatar`   | Upload de foto de perfil    | `MultipartFile`     |

Filtros disponíveis em `GET /users`: `name`, `email`, `isActive`, `search`, `sortBy`, `sortDesc`.

## Architecture Overview

**Kotlin + Spring Boot 3.5 REST API** — auth, user management, health endpoints. Java 21 target. No Lombok.

### Package Layout

```
com.apibot/
├── features/          # Core business domains
│   ├── auth/          # Authentication: login, registration, password recovery
│   ├── user/          # User CRUD, activation/deactivation, avatar upload
│   └── health/        # Health check endpoints
├── security/          # @GetUserId annotation + GetUserIdResolver
└── shared/            # Cross-cutting concerns
    ├── config/        # SecurityConfig, CORS, Auth, Mail, Firebase
    ├── constants/
    ├── exceptions/    # ApiExceptionHandler + all exception types
    ├── extensions/    # AuthenticatedPrincipal, Pagination, UserAccessScope
    ├── media/         # Cloudflare R2 upload (MediaUploadService)
    ├── security/      # CurrentUserProvider
    └── service/       # EmailService
```

### Auth Feature Structure

```
features/auth/
├── controller/         # /auth endpoints (login, register, password recovery)
├── service/            # Business logic + integrations
│   └── integration/    # BearerTokenAuthenticationFilter, CookieAuthenticationFilter,
│                       # EmailVerificationCodeService, AuthCookieFactory, GoogleOAuth2SuccessHandler
├── repository/         # UserAccount, UserSession, PasswordResetToken repositories
├── model/              # Domain models + JPA entities
├── dto/                # Request/Response DTOs
└── domain/exception/   # Auth-specific exceptions
```

### Repository Pattern

All features use three-layer repositories:

- `*Repository` — domain interface (port)
- `Jpa*Repository` — extends `JpaRepository<*Entity, UUID>`
- `Jpa*RepositoryAdapter` — `@Repository @Primary`, implements the port

The `user` feature also uses `*Specifications` under `repository/specification/` for dynamic filter queries via Spring Data's `Specification` API.

### Domain/Entity Split

Domain models are pure Kotlin `data class` objects. JPA entities are separate. Extension functions `*Entity.toDomain()` and `*.toEntity()` handle mapping. The `toResponse()` extension is defined directly on the domain class (e.g., `fun User.toResponse(): UserResponse`).

## Key Patterns

### Naming Conventions

- Packages: lowercase only
- `*Controller`, `*Service`, `*Repository`, `*Request`, `*Response`
- Code identifiers and Swagger documentation text: **English** (`@Operation`, `@Schema`, `@Tag`)

### Exception Handling

Use exceptions from `shared/exceptions/` — never return manual `ResponseEntity` errors from services:

| Exception                        | HTTP |
| -------------------------------- | ---- |
| `UnauthorizedException`          | 401  |
| `ForbiddenException`             | 403  |
| `ResourceNotFoundException`      | 404  |
| `ConflictException`              | 409  |
| `BusinessRuleViolationException` | 422  |
| `ServiceUnavailableException`    | 503  |

If a new exception type is needed, add it to `ApiExceptionHandler` explicitly.

Exception messages support i18n: wrap the message key in `{braces}` and `ApiMessageResolver` will resolve it from `messages_pt.properties` or `messages_en.properties` based on the `?lang=` query param (defaults to `pt`).

### Pagination

All paginated lists use `PageRequestParams` (input) and `PageResult<T>` (output) from `shared/extensions/Pagination.kt`. Never create per-module pagination DTOs.

Flow: Controller `@RequestParam page/size` → `PageRequestParams` → Service → Repository → `Page<Entity>.toPageResult { it.toDomain() }` → Controller maps to `PageResult<ResponseDTO>`.

### Authentication

Two filters run before the anonymous filter and both populate `AuthenticatedPrincipal` in the `SecurityContext`:

- `CookieAuthenticationFilter` — validates `AUTH_TOKEN` HttpOnly cookie (8h session via `UserSession`)
- `BearerTokenAuthenticationFilter` — validates `Authorization: Bearer <token>` header

To read the current user inside a service, inject `CurrentUserProvider` (`shared/security/`) and call `getCurrentUserId()` or `getCurrentPrincipal()`. Do NOT read `SecurityContextHolder` directly.

**Google OAuth2**: OAuth callback creates or finds user and returns session via cookie. Client controls redirect URL (passed as parameter). Handler: `GoogleOAuth2SuccessHandler`.

**Email verification**: `EmailVerificationCodeService` sends codes via `EmailService`.

### Email Templates

`EmailService` (`shared/service/EmailService.kt`) renders HTML templates from `src/main/resources/templates/emails/` using simple `{{variable}}` string interpolation — no template engine. Available templates: `email-verification-code.html`, `password-recovery.html`, `welcome-register.html`.

### API Documentation

Annotate controllers with `@Operation` and `@ApiResponse`. Annotate DTOs with `@Schema`. Documentation text must be in **English**.

## Scheduled Jobs

None currently. Pattern for future jobs: a `*Job` component holds only the `@Scheduled` method and delegates to a `*Service`; feature-scoped `*Properties` class (under `features/{name}/config/`) controls configuration.

## External Integrations

- **Database**: PostgreSQL (Render) — Hibernate `ddl-auto: update` + `schema.sql` init script
- **Email**: SMTP via Hostinger (`shared/service/EmailService.kt`). Configuration in `shared/config/MailProperties.kt`. Toggle with `app.mail.enabled`.
- **Storage**: Cloudflare R2 (S3-compatible). `MediaUploadService` (`shared/media/service/`) is `@ConditionalOnBean(S3Client::class)` — disabled when `app.storage.cloudflare.enabled=false`. Handles images/videos for feed, avatars, bio photos, exercise images.
- **Firebase**: Cloud messaging configured in `shared/config/FirebaseConfig.kt` and `shared/media/config/FirebaseStorageConfig.kt`.
- **Custom config properties**: App-specific config uses `@ConfigurationProperties` beans with the `app.*` prefix in `shared/config/`.

## OAuth 1.0a Auth Scheme (per-request signing)

`SecretAuthType.OAUTH1` (`.specs/003-autenticacao-oauth1-nas-ferramentas`, `C:\Projetos\docs\Workestrator\003-autenticacao-oauth1-nas-ferramentas\` — new specs from 003 onward live outside the repo) — the 8th auth scheme, added for legacy APIs that never migrated past OAuth 1.0a (Fluig/TOTVS). Unlike every other scheme, the header is **not** a fixed value calculated once and reused: it's a signature over method + final URL + a per-request nonce/timestamp, computed via `OAuth1Signer` (`runstep/service/integration/OAuth1Signer.kt`, RFC 5849).

- **`ProviderAuthResolver.HttpAuthTarget.signRequest` is an optional callback, not a header.** It only gets populated for `OAUTH1` (`applyAuthToHttpTarget`); every other scheme still returns a plain header in `headers`. **Any consumer of `HttpAuthTarget` must invoke `signRequest` if present** — ignoring it silently sends the request without `Authorization`. Today the only consumer is `HttpToolRunner.executeHttpTool`, which calls it after `applyUrlTemplate` resolves the final URL (the signature covers the URL byte-for-byte, so signing the template and substituting placeholders afterward would 401 every parametrized tool).
- **`consumerKey`/`token`/`signatureMethod`/`realm` live in `Secret.metadata`** (public, travel in clear on every request); the two secrets (`consumerSecret`/`tokenSecret`) are a JSON blob in the encrypted value (`{ "consumerSecret": "...", "tokenSecret": "..." }`, `tokenSecret` optional). Adding a metadata key for a new scheme? It must go into `knownAuthMetadataKeys` — anything outside that set leaks as a fixed HTTP header (`fixedMetadataHeaders`).
- **A credential of this scheme used as a model provider's `apiKeyRef` applies nothing and logs a warning** (D9) — there's no per-call signing point there, and failing silently would send an unauthenticated request that 401s three layers downstream with no clue why.
- **The JS port (`apps/web/electron/mcp-servers/oauth1.mjs`) must produce byte-identical signatures** for the same input (RF11) — the two executors (this backend, the Electron local runner) are verified against the **same test vectors** (RFC 5849 §3.4.1.3.1 normative example + a real Fluig URL with a non-default port), in `OAuth1SignerTest.kt` and `oauth1.test.ts` respectively. Changing the encoding/normalization logic on one side without mirroring the other produces a 401 on one executor and success on the other, with no other symptom.

## External Checkpoint Approvals (n8n → Teams, delegated approver)

`features/approval` (`.specs/001-aprovacoes-externas-teams`) — a checkpoint pause can notify externally via a webhook (n8n → Teams) and be decided by someone other than the squad owner. Key non-obvious points:

- **`ApprovalNotificationDispatcher.dispatch` is the only `@Async` method in the feature, and it lives in its own `@Component`** — never on `ApprovalService` or `WebhookNotifier`. Spring's `@Async` proxy only intercepts **cross-bean** calls; a method calling its own class's `@Async` method runs synchronously and silently ignores the annotation. `WebhookNotifier.send` also runs **synchronously** when called from `NotificationChannelService.test()` (the "Testar conexão" button needs the result immediately) — moving `@Async` onto `WebhookNotifier` itself would break that path.
- **`ApprovalRequest.approverUserIds`/`ownerCanDecide` are a snapshot** (design D8), copied from `Agent.approvalPolicy` at the moment `ApprovalService.create` runs — never re-resolved live. Changing an agent's policy never changes who can decide a request already pending.
- **Authorization is split three ways on the domain object itself** (`ApprovalRequest.canDecide`/`canCancel`/`canView`), never reimplemented in the service or controller: `canView` is more permissive than `canDecide` (the owner must be able to see a request to cancel it, even after opting out of deciding via `ownerCanDecide = false`); `canCancel` is owner-only **regardless** of `ownerCanDecide` (design D12 — opting out of deciding isn't opting out of aborting your own run).
- **`ApprovalService.decide` never throws on "already decided"** — it returns a sealed `DecideOutcome` (`Applied`/`AlreadyDecided`), and the controller maps `AlreadyDecided` to `409` **with the real `ApprovalResponse` body**, not a generic `ApiErrorResponse` (which has no field for arbitrary structured data). This is "first decision wins" (design D10): the n8n flow and the decision page both need to know who decided first, not just that a conflict happened.
- **D13 invariant (`ownerCanDecide: false` requires at least one approver, and every approver id must belong to the squad's pool) is validated in two places, not one**: `AgentService.validateApprovalPolicy` (private, called from both `createAgent`/`updateAgent`) and `SquadApproverService.remove` (blocks removing the last approver that would strand an agent). `AgentService` depends on `SquadApproverRepository` directly, **not** `SquadApproverService` — `SquadApproverService` already depends on `AgentService`, so depending on the service instead of the repository would create a Spring bean cycle.
- **Itens decidíveis (design D15/D16).** Um pedido pode carregar `items[]` (jsonb), cada item aprovado/reprovado por `POST /approvals/{id}/items/{itemId}/decide`. Pontos não óbvios: (a) `decide` do pedido inteiro **responde 422** quando há itens — um veredito de lote apagaria os individuais; (b) ao fechar o último item o pai resolve como `approved` se **algum** item passou, `rejected` só se todos foram reprovados (reprovar 2 de 20 não pode abortar o run); (c) `decideItem` é o **único método `@Transactional`** da feature e usa `findByIdForUpdate` (`SELECT … FOR UPDATE`) — ele reescreve o array `items` inteiro, então sem lock duas decisões concorrentes em itens *diferentes* se sobrescreveriam e o pedido travaria em `PENDING` para sempre, com o run pausado sem saída. `ApprovalNotificationDispatcher.dispatch` usa o mesmo lock pelo mesmo motivo; (d) `item.data` é **passthrough** — o backend nunca interpreta o esquema, que pertence ao domínio de quem montou o squad. Quem conhece `NUM_PROCESS`/`EXECUTOR_RESPONSAVEL` é o fluxo do n8n, e é lá que esse mapeamento deve ficar.
- **`sharedJsonMapper` (`shared/extensions/JsonConversion.kt`) precisa do `JavaTimeModule`.** A partir do Jackson 2.19 um `jacksonObjectMapper()` pelado **lança** em valor `java.time` (`REQUIRE_HANDLERS_FOR_JAVA8_TIMES`) em vez de degradar para número. `ApprovalItem.decidedAt` foi o primeiro `Instant` a passar por esse mapper no projeto — sem o módulo, toda decisão por item morria com 500 ao gravar o jsonb e o run ficava pausado. `ApprovalRequestEntityMappingTest` existe para travar isso.
- Tests use **in-memory `Fake*Repository` classes implementing the repository ports** — the project has no Mockito/mockk usage convention, only `kotlin-test-junit5` (see `ApprovalServiceTest`, `AgentServiceTest`, `SquadApproverServiceTest`, and the pre-existing `OAuthTokenServiceTest`).

## Scaffolding New Features

For AI-assisted scaffolding, use the `scaffold` agent under `.agents/agents/scaffold.md`. It creates the full feature skeleton (controller, service, 3-layer repository, DTOs, domain + JPA entity, mapping extensions) following the project conventions.

The legacy `scripts/new-ddd-module.ps1` script generates a different layout (`infra/`) that does not match the current architecture — prefer the agent.

## AI Agents and Skills

The `.agents/` directory holds machine-readable conventions for AI-assisted work:

- `.agents/agents/` — task agents: `scaffold`, `review`, `build`, `testing`
- `.agents/skills/` — focused conventions per topic: `architecture`, `controller`, `service`, `repository`, `dto-entity`, `exceptions`, `pagination`, `auth`, `validation`, `swagger`, `code-style`

When working on the codebase with Claude Code, read the relevant skill before changing files of that kind.
