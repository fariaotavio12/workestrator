package com.apibot.features.assistantsessiongroup.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "assistant_session_groups")
class AssistantSessionGroupEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var userId: UUID,

    @Column(nullable = false, columnDefinition = "text")
    var name: String = "",

    @Column(nullable = false)
    var sortOrder: Int = 0,

    @Column(nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    @Column(nullable = false)
    var updatedAt: Instant = Instant.now(),
) {
    @PrePersist
    fun prePersist() {
        val now = Instant.now()
        createdAt = now
        updatedAt = now
    }

    @PreUpdate
    fun preUpdate() {
        updatedAt = Instant.now()
    }

    fun toDomain(): AssistantSessionGroup = AssistantSessionGroup(
        id = this.id,
        userId = this.userId,
        name = this.name,
        sortOrder = this.sortOrder,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt,
    )
}

fun AssistantSessionGroup.toEntity(): AssistantSessionGroupEntity = AssistantSessionGroupEntity(
    id = this.id,
    userId = this.userId,
    name = this.name,
    sortOrder = this.sortOrder,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
