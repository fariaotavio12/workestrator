---
name: repository
description: Three-layer repository pattern for this Spring Boot project. Use when creating, reviewing, or refactoring repository ports, JpaRepository interfaces, adapters, custom queries, or Specification-based dynamic filters.
---

# Repository (3 layers + Specifications)

Persistence in this project uses three layers:

1. **`*Repository`** — pure Kotlin interface (port), no Spring/JPA imports
2. **`Jpa*Repository`** — extends `JpaRepository<*Entity, UUID>`
3. **`Jpa*RepositoryAdapter`** — `@Repository @Primary`, implements the port and converts entity ↔ domain

Services depend on the **port** only.

## Layer 1 — Domain port

```kotlin
package com.apibot.features.goal.repository

import com.apibot.features.goal.model.Goal
import java.util.UUID

interface GoalRepository {
    fun findAllByUserId(userId: UUID): List<Goal>
    fun findByIdAndUserId(id: UUID, userId: UUID): Goal?
    fun save(goal: Goal): Goal
    fun deleteById(id: UUID)
}
```

- Returns domain types only (`Goal`, never `GoalEntity`)
- No Spring imports
- No `Page<T>` — return `PageResult<T>` (see `pagination` skill)

## Layer 2 — Spring Data interface

```kotlin
package com.apibot.features.goal.repository

import com.apibot.features.goal.model.GoalEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface JpaGoalRepository :
    JpaRepository<GoalEntity, UUID>,
    JpaSpecificationExecutor<GoalEntity> {

    fun findAllByUserId(userId: UUID): List<GoalEntity>
    fun findByIdAndUserId(id: UUID, userId: UUID): GoalEntity?
}
```

- Use Spring Data derived queries when possible (`findByUserId`, `existsByEmail`)
- Use `@Query` only when derived names become unreadable (>3 fields)
- Add `JpaSpecificationExecutor<*Entity>` only when dynamic filters are needed

## Layer 3 — Adapter

```kotlin
package com.apibot.features.goal.repository

import com.apibot.features.goal.model.Goal
import com.apibot.features.goal.model.toDomain
import com.apibot.features.goal.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaGoalRepositoryAdapter(
    private val jpa: JpaGoalRepository,
) : GoalRepository {
    override fun findAllByUserId(userId: UUID): List<Goal> =
        jpa.findAllByUserId(userId).map { it.toDomain() }

    override fun findByIdAndUserId(id: UUID, userId: UUID): Goal? =
        jpa.findByIdAndUserId(id, userId)?.toDomain()

    override fun save(goal: Goal): Goal =
        jpa.save(goal.toEntity()).toDomain()

    override fun deleteById(id: UUID) = jpa.deleteById(id)
}
```

- Always `@Repository @Primary` — `@Primary` resolves any in-memory test double
- Domain ↔ entity conversion ALWAYS in the adapter, never in the service
- Methods one-liners when possible

## Conditional adapter

When Spring Data may not be available locally (e.g. no datasource configured), gate the adapter:

```kotlin
@Repository
@Primary
@ConditionalOnProperty(name = ["spring.datasource.url"], matchIfMissing = false)
class JpaUserAccountRepositoryAdapter(
    private val jpa: JpaUserAccountRepository,
) : UserAccountRepository { ... }
```

Useful for features that must boot without a DB (auth fallback, health endpoints).

## Specifications — dynamic filters

For list endpoints with optional filters, use `JpaSpecificationExecutor` and build a `Specification<T>` inside the adapter:

```kotlin
override fun search(filter: GoalFilter): List<Goal> {
    val spec = Specification<GoalEntity> { root, _, cb ->
        val predicates = mutableListOf<Predicate>()
        filter.userId?.let { predicates += cb.equal(root.get<UUID>("userId"), it) }
        filter.completed?.let { predicates += cb.equal(root.get<Boolean>("completed"), it) }
        cb.and(*predicates.toTypedArray())
    }
    return jpa.findAll(spec).map { it.toDomain() }
}
```

Filter classes live in `features/<feature>/repository/`, not in `dto/`.

## Pagination at the repository

When the service requests paginated data, the adapter calls `jpa.findAll(spec, pageable)` and converts:

```kotlin
override fun search(filter: GoalFilter, params: PageRequestParams): PageResult<Goal> =
    jpa.findAll(specOf(filter), PageRequest.of(params.page, params.size))
        .toPageResult { it.toDomain() }
```

`toPageResult` lives in `shared/extensions/Pagination.kt`.

## Review heuristics

- Service depends on `JpaGoalRepository` directly → use the port instead
- Adapter missing `@Primary` → in-memory doubles will not be overridden
- Domain types leak into `Jpa*Repository` (e.g. `findByEmail(): UserAccount?`) → it must return entities
- Specifications written inside the service → move to the adapter
- Custom `@Query` with hardcoded SQL strings instead of derived queries when both work → prefer derived
