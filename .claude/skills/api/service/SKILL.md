---
name: service
description: Service layer rules for this Spring Boot project. Use when creating, reviewing, or refactoring @Service classes, transactions, business rules, integration sub-services, or cross-feature service calls.
---

# Service

`@Service` classes live in `features/<feature>/service/`. They own business rules, validation, transactions and orchestration of repositories + integrations. They never see HTTP types.

## Skeleton

```kotlin
@Service
class GoalService(
    private val repository: GoalRepository,
    private val notifier: GoalNotifier,
) {
    fun listByUserId(userId: UUID): List<GoalResponse> =
        repository.findAllByUserId(userId).map { it.toResponse() }

    fun getById(id: UUID, userId: UUID): GoalResponse =
        repository.findByIdAndUserId(id, userId)?.toResponse()
            ?: throw ResourceNotFoundException("Goal not found")
}
```

## Rules

- Always `@Service`, constructor injection only
- No `ResponseEntity`, no `HttpStatus`, no servlet types
- Throw exceptions from `shared/exceptions/` instead of returning null/empty for "not found" or "forbidden"
- Hold `@Transactional` here — never on controllers
- Authorization checks (resource belongs to user) live here, not in the controller

## Transactions

Apply `@Transactional` on methods that mutate state or perform multiple repository writes:

```kotlin
@Transactional
fun create(userId: UUID, request: CreateGoalRequest): GoalResponse {
    val saved = repository.save(Goal.from(userId, request))
    notifier.goalCreated(saved)
    return saved.toResponse()
}
```

Use `@Transactional(readOnly = true)` for read-heavy queries that need a session (eg. lazy-loaded relations).

## Authorization checks

Always confirm ownership before mutating or returning a resource:

```kotlin
val existing = repository.findByIdAndUserId(id, userId)
    ?: throw ResourceNotFoundException("Goal not found")
```

Returning `ResourceNotFoundException` (404) instead of `ForbiddenException` (403) for foreign resources is intentional — it avoids leaking the existence of records owned by other users.

## External integrations

Anything that talks to a third-party (mail, push, Anthropic, Firebase, S3, …) lives in `service/integration/`:

```
features/auth/service/
├── LoginService.kt
├── RegisterService.kt
└── integration/
    ├── EmailVerificationCodeService.kt
    └── AuthCookieFactory.kt
```

The main service depends on the integration sub-service via interface or class. Keep the integration sub-service skinny — it should be the only place a 3rd-party SDK is touched.

## Cross-feature calls

A service may depend on another feature's service when the two domains overlap:

```kotlin
@Service
class CheckoutService(
    private val orderService: OrderService,         // same feature
    private val notificationService: NotificationService, // cross-feature, OK
)
```

Never reach across features into a *repository* — go through the other feature's service.

## Logging

Use SLF4J; declare the logger as a class-level `private val`:

```kotlin
class GoalService(...) {
    private val logger = LoggerFactory.getLogger(GoalService::class.java)
}
```

Log at:
- `info` — important business events (account created, payment captured)
- `warn` — recoverable failures or skipped work
- `error` — unexpected failures the handler will turn into 500
Never `println`.

## Review heuristics

- Service method longer than ~30 lines → split or extract a private method
- Service that imports `jakarta.servlet.*` → leaking HTTP — refactor
- Service that builds `ResponseEntity` → wrong layer
- Multiple services with duplicated mapping helpers → move helpers to `model/` as extension functions
- A service injecting a `JpaRepository` directly instead of the port → bypass the 3-layer pattern
