---
name: exceptions
description: Exception handling rules for this Spring Boot project. Use when throwing errors from a service, choosing the right HTTP status, adding new exception types, or extending the global ApiExceptionHandler.
---

# Exceptions

Errors are signalled by throwing typed exceptions from services. The global `ApiExceptionHandler` (`shared/exceptions/`) translates them into a consistent `ApiErrorResponse` JSON. Controllers and services **never** build error `ResponseEntity` objects manually.

## Canonical exceptions

All live in `com.apibot.shared.exceptions`:

| Exception | HTTP | Use when |
|---|---|---|
| `UnauthorizedException` | 401 | Caller has no valid session / bad credentials |
| `ForbiddenException` | 403 | Authenticated but not allowed for this resource (use sparingly — see below) |
| `ResourceNotFoundException` | 404 | Resource not found, OR resource belongs to another user (do not leak existence) |
| `ConflictException` | 409 | Duplicate, optimistic-lock, current state forbids the change |
| `BusinessRuleViolationException` | 422 | Domain rule violated (e.g. "cannot finish a workout that has not started") |
| `ServiceUnavailableException` | 503 | A required external dependency is down or misconfigured |

Validation errors (`MethodArgumentNotValidException`, `ConstraintViolationException`) → 400, handled automatically. You don't throw these.

## Choosing the right one

```kotlin
val goal = repository.findByIdAndUserId(id, userId)
    ?: throw ResourceNotFoundException("Goal not found")     // 404 — also covers "not yours"

if (goal.isLocked) throw ConflictException("Goal is locked") // 409

if (request.target < goal.minTarget)
    throw BusinessRuleViolationException("Target below allowed minimum") // 422

if (anthropicClient.apiKey.isBlank())
    throw ServiceUnavailableException("AI service unavailable") // 503
```

`ForbiddenException` is correct when the *user is the owner but the operation is denied by role/permission* — not when the resource is owned by someone else.

```kotlin
// ✅ user is the owner, but role is too low
if (user.role != UserRole.ADMIN) throw ForbiddenException("Admin required")

// ❌ leaks existence
if (goal.userId != userId) throw ForbiddenException("Not yours")
// ✅ correct
if (goal.userId != userId) throw ResourceNotFoundException("Goal not found")
```

## Adding a new exception

1. Add the class to `shared/exceptions/`:
   ```kotlin
   class PaymentRequiredException(message: String) : RuntimeException(message)
   ```
2. Register it in `ApiExceptionHandler`:
   ```kotlin
   @ExceptionHandler(PaymentRequiredException::class)
   fun handlePaymentRequired(
       exception: PaymentRequiredException,
       request: HttpServletRequest,
   ): ResponseEntity<ApiErrorResponse> = buildResponse(
       status = HttpStatus.PAYMENT_REQUIRED,
       message = exception.message ?: "Payment required",
       request = request,
   )
   ```
3. Avoid creating feature-scoped exceptions unless they map to a unique HTTP status. Reuse the canonical types when possible.

Feature-specific exceptions that share a status with a canonical one (e.g. `InvalidCredentialsException` → 401) live in `features/<feature>/domain/exception/` and are also wired into `ApiExceptionHandler`.

## Error response shape

`ApiErrorResponse` JSON:

```json
{
  "timestamp": "2026-05-05T12:00:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Goal not found",
  "path": "/goals/abc",
  "traceId": "...",
  "details": null
}
```

`details` is filled for validation failures (`MethodArgumentNotValidException`).

## Rules

- Never wrap an exception just to rename it — let it bubble
- Never catch `Exception` to log + rethrow at the same layer; let `ApiExceptionHandler` do that
- Never use `HttpStatus` outside the controller layer — services throw, the handler maps
- Messages are user-facing: short, English, no stack traces, no internal IDs

## Review heuristics

- `throw RuntimeException(...)` → replace with a typed exception
- `throw IllegalStateException(...)` for client-facing errors → replace with `BusinessRuleViolationException` or `ConflictException`
- `try { … } catch (e: Exception) { return ResponseEntity.status(500)... }` → delete the try/catch, let it bubble
- Manual `ResponseEntity.status(404).body(mapOf(...))` → throw `ResourceNotFoundException`
