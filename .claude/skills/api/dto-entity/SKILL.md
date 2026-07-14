---
name: dto-entity
description: DTO, domain model and JPA entity rules for this Spring Boot project. Use when designing or reviewing request/response payloads, domain data classes, JPA entities, mapping helpers, or shared API primitives.
---

# DTO, Domain and Entity

Three concentric layers — never collapse them.

```
Request  ──┐
           │ controller
           ▼
       Domain (data class)
           ▲
           │ adapter
       Entity (JPA class)
           │
           ▼
Response ──┘  controller
```

## DTO — `features/<feature>/dto/`

DTOs are pure transport types. Two kinds:

- `*Request` — incoming JSON, has Bean Validation annotations
- `*Response` — outgoing JSON, has `@Schema` annotations only

```kotlin
@Schema(description = "Request payload to create a goal")
data class CreateGoalRequest(
    @field:NotBlank
    @Schema(description = "Goal title", example = "Lose 5 kg")
    val title: String,

    @field:Min(1)
    @Schema(description = "Target value", example = "75")
    val target: Int,
)

@Schema(description = "Goal response")
data class GoalResponse(
    val id: UUID,
    val userId: UUID,
    val title: String,
    val target: Int,
    val createdAt: Instant,
)
```

- Always `data class`
- Always `val`, never `var`
- Validation uses **`@field:`** prefix — Kotlin requires it for annotation targeting
- `@Schema` description text is **English**

## Domain model — `features/<feature>/model/<Resource>.kt`

Pure Kotlin `data class`. No Spring, no JPA, no Jackson. Holds business logic as methods or extension functions.

```kotlin
data class Goal(
    val id: UUID = UUID.randomUUID(),
    val userId: UUID,
    val title: String,
    val target: Int,
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now(),
) {
    fun applyUpdate(request: UpdateGoalRequest): Goal =
        copy(title = request.title, target = request.target, updatedAt = Instant.now())

    companion object {
        fun from(userId: UUID, request: CreateGoalRequest): Goal =
            Goal(userId = userId, title = request.title, target = request.target)
    }
}
```

Mapping helpers live next to the domain class as extension functions:

```kotlin
fun Goal.toResponse(): GoalResponse = GoalResponse(
    id = id, userId = userId, title = title, target = target, createdAt = createdAt,
)
```

## JPA entity — `features/<feature>/model/<Resource>Entity.kt`

`class` (not `data class`) because Hibernate prefers mutable, non-final classes.

```kotlin
@Entity
@Table(name = "goal")
class GoalEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(name = "user_id", nullable = false)
    var userId: UUID,

    @Column(nullable = false, length = 120)
    var title: String,

    @Column(nullable = false)
    var target: Int,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)
```

- Use `var` for properties (Hibernate writes them)
- Always declare `@Table(name = "...")` with snake_case
- Use `@Column(name = "...")` when the column does not match the property name 1:1 with snake_case
- Avoid bidirectional relations unless really needed; prefer storing the foreign key UUID

### Mapping extensions

Always co-located with the entity:

```kotlin
fun GoalEntity.toDomain(): Goal = Goal(
    id = id, userId = userId, title = title, target = target,
    createdAt = createdAt, updatedAt = updatedAt,
)

fun Goal.toEntity(): GoalEntity = GoalEntity(
    id = id, userId = userId, title = title, target = target,
    createdAt = createdAt, updatedAt = updatedAt,
)
```

## What lives where — quick reference

| Concern | Goes in |
|---|---|
| `@field:NotBlank`, `@field:Email`, `@field:Size` | DTO |
| `@Schema` | DTO |
| Business invariants | Domain |
| Default factory `from()` | Domain `companion object` |
| `applyUpdate(request)` | Domain |
| `@Entity`, `@Table`, `@Column` | Entity |
| `toDomain()` / `toEntity()` | Entity file (extension functions) |
| `toResponse()` | Domain file (extension function) |

## Shared primitives

Shared cross-feature types live in `shared/extensions/`:

- `PageRequestParams` / `PageResult<T>` — `Pagination.kt`
- `AuthenticatedPrincipal` — `AuthenticatedPrincipal.kt`

Never re-create these inside a feature's `dto/`.

## Review heuristics

- DTO with `@Entity` annotation → wrong class
- Domain class with `@Schema` → wrong class
- `@field:NotBlank` written without the `field:` target → annotation hits the property metadata, not the validator
- `data class` for a JPA entity → Hibernate proxy issues
- Mapping logic inside a service → push to extension functions in `model/`
- DTOs returned directly from a repository → pass through service which re-maps
