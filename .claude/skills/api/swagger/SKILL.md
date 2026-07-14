---
name: swagger
description: Swagger / OpenAPI annotation rules for this Spring Boot project. Use when documenting controllers, DTOs, request/response schemas, security requirements, tags, or examples. All Swagger text must be in English.
---

# Swagger / OpenAPI

The project exposes Swagger UI at `http://localhost:8080/swagger-ui.html` and the spec at `/v3/api-docs`. Documentation text is **English**. Code identifiers are also English. Use English in `@Operation`, `@Schema`, `@Tag`, and `@ApiResponse`.

## Controller-level

```kotlin
@RestController
@RequestMapping("/goals")
@Tag(name = "Goal")                          // groups endpoints in the UI
@SecurityRequirement(name = "Bearer")        // applies bearer auth to every method
class GoalController(private val service: GoalService) {

    @GetMapping
    @Operation(
        summary = "List the user's goals",
        description = "Returns every goal owned by the authenticated user, ordered by creation date.",
    )
    @ApiResponse(responseCode = "200", description = "List of goals")
    fun list(@GetUserId userId: String): ResponseEntity<List<GoalResponse>> = ...
}
```

Conventions:
- `@Tag(name = "PascalCase")` — singular, English (`Workout`, `Goal`, `Notification`)
- `@Operation(summary = "...")` — short imperative sentence (≤ 80 chars)
- Add `description` only when the summary needs more context
- `@SecurityRequirement(name = "Bearer")` — at class level for whole-resource auth, at method level for the rare public-in-protected-resource case

## DTOs

```kotlin
@Schema(description = "Request payload to create a goal")
data class CreateGoalRequest(
    @field:NotBlank
    @Schema(description = "Goal title", example = "Lose 5 kg")
    val title: String,

    @Schema(description = "Target value", example = "75")
    val target: Int,
)

@Schema(description = "Goal response")
data class GoalResponse(
    @Schema(description = "Goal identifier", example = "f47ac10b-58cc-4372-a567-0e02b2c3d479")
    val id: UUID,
    val userId: UUID,
    val title: String,
    val target: Int,
    val createdAt: Instant,
)
```

Conventions:
- Top-level `@Schema(description = "...")` on the class
- `@Schema(example = "...")` on fields when an example helps disambiguation
- Skip `@Schema` on obvious fields (`id`, `userId`, timestamps) once their meaning is documented at class level
- Mark optional fields with `@Schema(nullable = true)` only when required for clients

## Multiple responses

```kotlin
@Operation(summary = "Get goal by id")
@ApiResponses(
    value = [
        ApiResponse(responseCode = "200", description = "Goal returned"),
        ApiResponse(responseCode = "404", description = "Goal not found"),
    ],
)
fun getById(...): ResponseEntity<GoalResponse>
```

You don't need to enumerate 401/403 — they are documented globally by the security scheme.

## Request bodies and examples

For complex bodies, attach an example:

```kotlin
@PostMapping
@Operation(summary = "Create a goal")
fun create(
    @Valid
    @RequestBody(
        description = "Goal payload",
        required = true,
        content = [
            Content(
                mediaType = "application/json",
                examples = [
                    ExampleObject(
                        name = "Strength goal",
                        value = """{ "title": "Bench 100 kg", "target": 100 }""",
                    ),
                ],
            ),
        ],
    )
    request: CreateGoalRequest,
): ResponseEntity<GoalResponse>
```

Use sparingly — only when the example clarifies more than the schema does.

## Hidden endpoints

For internal/health-style endpoints that should not appear in the public spec:

```kotlin
@Hidden
@GetMapping("/internal/cache-status")
```

## Rules

- All Swagger text in **English**
- Never write summaries longer than one sentence
- Never duplicate field documentation between the property name and `@Schema` (`val email: String, @Schema(description = "Email")` adds no info)
- Never put example PII (real emails, real phone numbers) in `example = "..."`
- Keep schemas accurate — when a field is optional, mark it; when it has a default, mention it

## Review heuristics

- `@Tag(name = "Autenticação")` or other Portuguese text → translate to English
- `@Operation` missing on a non-trivial endpoint → add a one-line summary
- `@Schema(description = "...")` repeating the field name → drop it
- Authenticated controller missing `@SecurityRequirement` → add at the class level
- `@Schema` on a JPA entity → wrong layer (entities are not exposed)
