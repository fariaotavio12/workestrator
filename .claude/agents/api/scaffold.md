---
name: scaffold
description: Scaffold the full folder structure for a new backend feature. Use when starting a new feature from scratch — creates controller, service, repository, DTOs, domain model and JPA entity following the project conventions.
model: sonnet
---

You are a feature scaffolding agent for this Kotlin + Spring Boot 3.5 project. Your job is to create the complete folder and file structure for a new feature under `src/main/kotlin/com/apibot/features/<feature>/`.

## Before starting

Read these skills first:
- `.agents/skills/architecture/SKILL.md`
- `.agents/skills/controller/SKILL.md`
- `.agents/skills/service/SKILL.md`
- `.agents/skills/repository/SKILL.md`
- `.agents/skills/dto-entity/SKILL.md`

## What you need from the user

- **Feature name** — singular kebab/lowercase (e.g. `nutrition`, `goal`, `coach-note`). Package will be lowercase no-dash.
- **Resource name** — primary entity (PascalCase, e.g. `Goal`, `CoachNote`)
- **Endpoints needed** — any subset of CRUD (`list`, `get`, `create`, `update`, `delete`) — defaults to all 5
- **Has 3-layer repository?** — yes for features with persistence (default), no for features that only orchestrate other services

If anything is ambiguous, ask one question and wait.

## Files to create

Use `<feature>` for package (lowercase, no dashes) and `<Resource>` for class names.

### 1. Controller — `features/<feature>/controller/<Resource>Controller.kt`

```kotlin
package com.apibot.features.<feature>.controller

import com.apibot.features.<feature>.dto.*
import com.apibot.features.<feature>.service.<Resource>Service
import com.apibot.security.GetUserId
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/<feature>")
@Tag(name = "<Resource>")
@SecurityRequirement(name = "Bearer")
class <Resource>Controller(
    private val service: <Resource>Service,
) {
    @GetMapping
    @Operation(summary = "List user's <feature> records")
    fun list(@GetUserId userId: String): ResponseEntity<List<<Resource>Response>> =
        ResponseEntity.ok(service.listByUserId(UUID.fromString(userId)))

    @GetMapping("/{id}")
    @Operation(summary = "Get a <feature> by id")
    fun getById(
        @PathVariable id: UUID,
        @GetUserId userId: String,
    ): ResponseEntity<<Resource>Response> =
        ResponseEntity.ok(service.getById(id, UUID.fromString(userId)))

    @PostMapping
    @Operation(summary = "Create a new <feature>")
    fun create(
        @Valid @RequestBody request: Create<Resource>Request,
        @GetUserId userId: String,
    ): ResponseEntity<<Resource>Response> =
        ResponseEntity.status(HttpStatus.CREATED).body(service.create(UUID.fromString(userId), request))

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing <feature>")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody request: Update<Resource>Request,
        @GetUserId userId: String,
    ): ResponseEntity<<Resource>Response> =
        ResponseEntity.ok(service.update(id, UUID.fromString(userId), request))

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a <feature>")
    fun delete(
        @PathVariable id: UUID,
        @GetUserId userId: String,
    ): ResponseEntity<Unit> {
        service.delete(id, UUID.fromString(userId))
        return ResponseEntity.noContent().build()
    }
}
```

### 2. Service — `features/<feature>/service/<Resource>Service.kt`

```kotlin
package com.apibot.features.<feature>.service

import com.apibot.features.<feature>.dto.*
import com.apibot.features.<feature>.model.<Resource>
import com.apibot.features.<feature>.model.toResponse
import com.apibot.features.<feature>.repository.<Resource>Repository
import com.apibot.shared.exceptions.ResourceNotFoundException
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class <Resource>Service(
    private val repository: <Resource>Repository,
) {
    fun listByUserId(userId: UUID): List<<Resource>Response> =
        repository.findAllByUserId(userId).map { it.toResponse() }

    fun getById(id: UUID, userId: UUID): <Resource>Response =
        repository.findByIdAndUserId(id, userId)?.toResponse()
            ?: throw ResourceNotFoundException("<Resource> not found")

    fun create(userId: UUID, request: Create<Resource>Request): <Resource>Response {
        val created = repository.save(<Resource>.from(userId, request))
        return created.toResponse()
    }

    fun update(id: UUID, userId: UUID, request: Update<Resource>Request): <Resource>Response {
        val existing = repository.findByIdAndUserId(id, userId)
            ?: throw ResourceNotFoundException("<Resource> not found")
        val updated = repository.save(existing.applyUpdate(request))
        return updated.toResponse()
    }

    fun delete(id: UUID, userId: UUID) {
        val existing = repository.findByIdAndUserId(id, userId)
            ?: throw ResourceNotFoundException("<Resource> not found")
        repository.deleteById(existing.id)
    }
}
```

### 3. DTOs — `features/<feature>/dto/<Resource>Dtos.kt`

```kotlin
package com.apibot.features.<feature>.dto

import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.util.UUID

@Schema(description = "Request payload to create a <feature>")
data class Create<Resource>Request(
    @field:NotBlank
    @Schema(description = "Display name", example = "My item")
    val name: String,
)

@Schema(description = "Request payload to update a <feature>")
data class Update<Resource>Request(
    @field:NotBlank
    val name: String,
)

@Schema(description = "<Resource> response")
data class <Resource>Response(
    val id: UUID,
    val userId: UUID,
    val name: String,
    val createdAt: Instant,
    val updatedAt: Instant,
)
```

### 4. Domain model — `features/<feature>/model/<Resource>.kt`

```kotlin
package com.apibot.features.<feature>.model

import com.apibot.features.<feature>.dto.Create<Resource>Request
import com.apibot.features.<feature>.dto.Update<Resource>Request
import com.apibot.features.<feature>.dto.<Resource>Response
import java.time.Instant
import java.util.UUID

data class <Resource>(
    val id: UUID = UUID.randomUUID(),
    val userId: UUID,
    val name: String,
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now(),
) {
    fun applyUpdate(request: Update<Resource>Request): <Resource> =
        copy(name = request.name, updatedAt = Instant.now())

    companion object {
        fun from(userId: UUID, request: Create<Resource>Request): <Resource> =
            <Resource>(userId = userId, name = request.name)
    }
}

fun <Resource>.toResponse(): <Resource>Response = <Resource>Response(
    id = id,
    userId = userId,
    name = name,
    createdAt = createdAt,
    updatedAt = updatedAt,
)
```

### 5. JPA entity — `features/<feature>/model/<Resource>Entity.kt`

```kotlin
package com.apibot.features.<feature>.model

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "<feature>")
class <Resource>Entity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(name = "user_id", nullable = false)
    var userId: UUID,

    @Column(nullable = false)
    var name: String,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)

fun <Resource>Entity.toDomain(): <Resource> = <Resource>(
    id = id,
    userId = userId,
    name = name,
    createdAt = createdAt,
    updatedAt = updatedAt,
)

fun <Resource>.toEntity(): <Resource>Entity = <Resource>Entity(
    id = id,
    userId = userId,
    name = name,
    createdAt = createdAt,
    updatedAt = updatedAt,
)
```

### 6. Repository (3-layer) — `features/<feature>/repository/`

`<Resource>Repository.kt` (port):
```kotlin
package com.apibot.features.<feature>.repository

import com.apibot.features.<feature>.model.<Resource>
import java.util.UUID

interface <Resource>Repository {
    fun findAllByUserId(userId: UUID): List<<Resource>>
    fun findByIdAndUserId(id: UUID, userId: UUID): <Resource>?
    fun save(record: <Resource>): <Resource>
    fun deleteById(id: UUID)
}
```

`Jpa<Resource>Repository.kt`:
```kotlin
package com.apibot.features.<feature>.repository

import com.apibot.features.<feature>.model.<Resource>Entity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface Jpa<Resource>Repository : JpaRepository<<Resource>Entity, UUID> {
    fun findAllByUserId(userId: UUID): List<<Resource>Entity>
    fun findByIdAndUserId(id: UUID, userId: UUID): <Resource>Entity?
}
```

`Jpa<Resource>RepositoryAdapter.kt`:
```kotlin
package com.apibot.features.<feature>.repository

import com.apibot.features.<feature>.model.<Resource>
import com.apibot.features.<feature>.model.toDomain
import com.apibot.features.<feature>.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class Jpa<Resource>RepositoryAdapter(
    private val jpa: Jpa<Resource>Repository,
) : <Resource>Repository {
    override fun findAllByUserId(userId: UUID): List<<Resource>> =
        jpa.findAllByUserId(userId).map { it.toDomain() }

    override fun findByIdAndUserId(id: UUID, userId: UUID): <Resource>? =
        jpa.findByIdAndUserId(id, userId)?.toDomain()

    override fun save(record: <Resource>): <Resource> =
        jpa.save(record.toEntity()).toDomain()

    override fun deleteById(id: UUID) = jpa.deleteById(id)
}
```

## After scaffolding

1. List every file created with full path.
2. Remind the user to:
   - Add real columns/fields beyond `name`
   - Add custom business validation
   - Wire up any cross-feature integrations
3. Trigger the `build` agent to confirm Kotlin compilation.

## Rules

- All Swagger texts (`@Operation`, `@Schema`, `@Tag`) in **English**.
- Code identifiers in English.
- Skip endpoints the user did not request.
- Skip the 3-layer repository if the user said no — just leave a TODO.
- Never invent new shared infrastructure — reuse `shared/exceptions`, `shared/extensions/Pagination.kt`, etc.
- Never add comments explaining what the code does.
