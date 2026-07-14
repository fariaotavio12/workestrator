---
name: validation
description: Bean Validation rules for this Spring Boot project. Use when adding constraints to request DTOs, building custom validators, or wiring @Valid through controllers and method-level validation.
---

# Validation

Validation is enforced via **Jakarta Bean Validation** (`jakarta.validation.constraints.*`). DTOs declare the rules, controllers trigger them with `@Valid`, the global handler turns failures into `400 Payload inválido` with field-level details.

## Annotating DTOs

Kotlin requires the **`@field:`** target so the annotation lands on the JVM field where Hibernate Validator reads it. Without it, the annotation hits the property metadata and is ignored.

```kotlin
@Schema(description = "Request payload for login")
data class LoginRequest(
    @field:NotBlank
    @field:Email
    @Schema(description = "Account email", example = "user@example.com")
    val email: String,

    @field:NotBlank
    @field:Size(min = 8, max = 128)
    @Schema(description = "Account password", example = "********")
    val password: String,
)
```

Common constraints:

| Constraint | Use |
|---|---|
| `@field:NotBlank` | Strings that must contain non-whitespace |
| `@field:NotNull` | Non-string non-nullable fields (`UUID`, `Int`, ...) |
| `@field:Size(min, max)` | String / collection length |
| `@field:Min(n)` / `@field:Max(n)` | Numeric bounds |
| `@field:Email` | Email format |
| `@field:Pattern(regexp = "...")` | Regex |
| `@field:Past` / `@field:Future` | Temporal |
| `@field:Positive` / `@field:PositiveOrZero` | Numbers |

## Triggering on a controller

```kotlin
@PostMapping
fun create(
    @Valid @RequestBody request: CreateGoalRequest,
    @GetUserId userId: String,
): ResponseEntity<GoalResponse>
```

Without `@Valid`, the constraints are silently skipped.

## Method-level on @RequestParam / @PathVariable

To validate path or query params, annotate the **class** with `@Validated` and put the constraint on the parameter:

```kotlin
@RestController
@Validated
class GoalController(...) {
    @GetMapping("/{id}")
    fun get(@PathVariable @org.hibernate.validator.constraints.UUID id: String) = ...
}
```

## Nested DTOs

Constraints inside nested DTOs are validated only when the parent property is annotated `@field:Valid`:

```kotlin
data class CreateOrderRequest(
    @field:Valid
    @field:NotEmpty
    val items: List<OrderItemRequest>,
)
```

## Error response

Validation failure → `MethodArgumentNotValidException`, handled in `ApiExceptionHandler.handleValidation`:

```json
{
  "timestamp": "...",
  "status": 400,
  "error": "Bad Request",
  "message": "Payload inválido",
  "path": "/goals",
  "details": ["title: must not be blank", "target: must be greater than 0"]
}
```

The handler-level message string is set inside `ApiExceptionHandler`. Field message strings can be customized per constraint:

```kotlin
@field:NotBlank(message = "Title is required")
val title: String,
```

Keep messages in **English** for consistency with the rest of the public API surface.

## Custom validator

When you need a rule not covered by the built-ins:

1. Define an annotation:
   ```kotlin
   @Target(AnnotationTarget.FIELD)
   @Retention(AnnotationRetention.RUNTIME)
   @MustBeDocumented
   @Constraint(validatedBy = [StrongPasswordValidator::class])
   annotation class StrongPassword(
       val message: String = "Password too weak",
       val groups: Array<KClass<*>> = [],
       val payload: Array<KClass<out Payload>> = [],
   )
   ```
2. Implement the validator:
   ```kotlin
   class StrongPasswordValidator : ConstraintValidator<StrongPassword, String> {
       override fun isValid(value: String?, ctx: ConstraintValidatorContext) =
           value != null && value.length >= 12 && value.any { it.isDigit() }
   }
   ```
3. Use it: `@field:StrongPassword val password: String`.

## Rules

- Always combine `@Valid` (controller) with `@field:` constraints (DTO) — both are required
- Never validate inside the controller body manually (`if (request.email.isBlank()) ...`) — let the framework do it
- Never validate inside the service for shape errors that the framework already covers
- Service-level domain rules (e.g. "email already taken") throw `ConflictException` — they are not validation, they are business rules

## Review heuristics

- Constraint without `@field:` target → silently ignored
- Controller missing `@Valid` on a `@RequestBody` → DTOs constraints never run
- DTO with constraints that overlap with the database (NOT NULL) → keep the DTO constraint; DB is the last line of defence, not the first
- Manual validation `if/else` chains in services that mirror what `@field:NotBlank` already covers → delete and rely on Bean Validation
