---
name: controller
description: REST controller rules for this Spring Boot project. Use when creating, reviewing or refactoring @RestController classes, request mapping, response handling, authenticated user resolution, or HTTP status codes.
---

# Controller

`@RestController` classes live in `features/<feature>/controller/`. Their only job is to translate HTTP into a service call and back. No business logic, no transactions, no manual error responses.

## Class skeleton

```kotlin
@RestController
@RequestMapping("/workouts")
@Tag(name = "Workout")
@SecurityRequirement(name = "Bearer")
class WorkoutController(
    private val service: WorkoutService,
) {
    @GetMapping
    @Operation(summary = "List the user's workout plans")
    fun list(@GetUserId userId: String): ResponseEntity<List<WorkoutResponse>> =
        ResponseEntity.ok(service.listByUserId(UUID.fromString(userId)))
}
```

## Authenticated user

Use `@GetUserId` for the user UUID as `String`. Use `@AuthenticatedPrincipal` when you need the full principal (email, role, etc.).

```kotlin
fun create(
    @Valid @RequestBody request: CreateGoalRequest,
    @GetUserId userId: String,
): ResponseEntity<GoalResponse>
```

Never:
- Receive a raw `Authentication` parameter and cast its principal
- Read user id from the request body
- Trust an `X-User-Id` header

## HTTP status codes

| Action | Status |
|---|---|
| GET / list | 200 |
| POST create | 201 |
| PUT / PATCH update | 200 |
| DELETE | 204 |
| Async accepted | 202 |

```kotlin
ResponseEntity.status(HttpStatus.CREATED).body(response)
ResponseEntity.noContent().build() // 204
```

## Errors — never build them manually

```kotlin
// ❌
return ResponseEntity.status(HttpStatus.NOT_FOUND).body(mapOf("error" to "..."))

// ✅
throw ResourceNotFoundException("Workout not found")
```

The service throws — `ApiExceptionHandler` formats the response.

## Validation

Always combine `@Valid` with the request body for DTOs that carry constraints:

```kotlin
fun update(
    @PathVariable id: UUID,
    @Valid @RequestBody request: UpdateWorkoutRequest,
)
```

For `@RequestParam` constraints (rare), annotate the controller class with `@Validated` and put the constraint on the parameter directly.

## Pagination

```kotlin
@GetMapping
fun list(
    @RequestParam(defaultValue = "0") page: Int,
    @RequestParam(defaultValue = "20") size: Int,
    @GetUserId userId: String,
): ResponseEntity<PageResult<WorkoutResponse>> {
    val params = PageRequestParams(page, size).normalized()
    return ResponseEntity.ok(service.list(UUID.fromString(userId), params))
}
```

See `pagination` skill for the full flow.

## Swagger

- Class-level `@Tag(name = "PascalCase")` to group endpoints
- Method-level `@Operation(summary = "...")` — short, English
- Authenticated routes carry `@SecurityRequirement(name = "Bearer")`
- For non-trivial responses add `@ApiResponse(responseCode = "...", description = "...")`

All Swagger text is in **English**. Schema text is also English (see `swagger` skill).

## Things controllers must NOT do

- Hold `@Transactional` — that lives on the service
- Build SQL or call repositories directly
- Catch exceptions to translate them — let them bubble to `ApiExceptionHandler`
- Use `Map<String, Any>` as a response type — always a typed `*Response`
- Call other controllers — controllers are leaves, not nodes

## Review heuristics

- Controller imports `org.springframework.data.*` → likely doing repo work
- Method body longer than ~5 lines → push logic to service
- Manual `ResponseEntity` with error JSON → replace with thrown exception
- `Authentication` parameter that is then cast → switch to `@GetUserId` or `@AuthenticatedPrincipal`
