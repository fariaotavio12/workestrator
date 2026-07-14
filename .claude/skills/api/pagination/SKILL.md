---
name: pagination
description: Pagination rules for this Spring Boot project. Use whenever a list endpoint must page results, build PageRequestParams, return PageResult<T>, or convert a Spring Data Page to the project's response shape.
---

# Pagination

The project uses two shared types defined in `shared/extensions/Pagination.kt`:

- `PageRequestParams(page: Int = 0, size: Int = 20)` — controller input, with `.normalized(maxSize = 100)`
- `PageResult<T>` — response shape: `data, page, size, totalElements, totalPages, hasNext, hasPrevious`
- `Page<T>.toPageResult { mapper }` — extension to convert Spring Data results

Never re-create per-feature pagination DTOs.

## End-to-end flow

### 1. Controller

```kotlin
@GetMapping
@Operation(summary = "List goals (paginated)")
fun list(
    @RequestParam(defaultValue = "0") page: Int,
    @RequestParam(defaultValue = "20") size: Int,
    @GetUserId userId: String,
): ResponseEntity<PageResult<GoalResponse>> {
    val params = PageRequestParams(page, size).normalized()
    return ResponseEntity.ok(service.list(UUID.fromString(userId), params))
}
```

`normalized()` clamps `page ≥ 0` and `1 ≤ size ≤ 100`. If you need a different cap, pass it: `params.normalized(maxSize = 50)`.

### 2. Service

```kotlin
fun list(userId: UUID, params: PageRequestParams): PageResult<GoalResponse> =
    repository.findAllByUserId(userId, params).map { it.toResponse() }

private fun PageResult<Goal>.map(transform: (Goal) -> GoalResponse): PageResult<GoalResponse> =
    PageResult(
        data = data.map(transform),
        page = page,
        size = size,
        totalElements = totalElements,
        totalPages = totalPages,
        hasNext = hasNext,
        hasPrevious = hasPrevious,
    )
```

Or — preferred — keep mapping inside the adapter and return `PageResult<Goal>` from the port, then `.map(...)` in the service.

### 3. Repository port

```kotlin
interface GoalRepository {
    fun findAllByUserId(userId: UUID, params: PageRequestParams): PageResult<Goal>
}
```

### 4. Adapter

```kotlin
override fun findAllByUserId(userId: UUID, params: PageRequestParams): PageResult<Goal> =
    jpa.findAllByUserId(userId, PageRequest.of(params.page, params.size))
        .toPageResult { it.toDomain() }
```

`Page<GoalEntity>.toPageResult { it.toDomain() }` does the conversion.

## Sorting

When the endpoint accepts a sort parameter, build the `Sort` inside the adapter:

```kotlin
val sort = when (params.sortBy) {
    "createdAt" -> Sort.by(Sort.Direction.DESC, "createdAt")
    else -> Sort.by(Sort.Direction.ASC, "title")
}
jpa.findAllByUserId(userId, PageRequest.of(params.page, params.size, sort))
```

If sort gets complex, extend `PageRequestParams` (project-wide) rather than passing a free string.

## With Specifications

```kotlin
override fun search(filter: GoalFilter, params: PageRequestParams): PageResult<Goal> =
    jpa.findAll(specOf(filter), PageRequest.of(params.page, params.size))
        .toPageResult { it.toDomain() }
```

## Rules

- The controller is the only layer that reads `@RequestParam page/size`
- Only call `.normalized()` once — at the controller boundary
- Repositories accept `PageRequestParams`, never raw `Pageable`
- Mapping `entity → domain → response` happens in this order; never short-circuit

## Review heuristics

- A feature-local `PageX` DTO → delete and use `PageResult<T>`
- Repository returning `Page<EntityType>` to a service → adapter must convert before crossing the boundary
- Controller passing `Pageable` to the service → wrong abstraction; pass `PageRequestParams`
- `size` not bounded → call `.normalized()`
