package com.apibot.features.assistantsession.model

import com.apibot.shared.extensions.emptyJsonArray
import com.apibot.shared.extensions.toJsonNode
import com.apibot.shared.extensions.toObject
import com.fasterxml.jackson.databind.JsonNode
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "assistant_sessions")
class AssistantSessionEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var userId: UUID,

    @Column(nullable = false, columnDefinition = "text")
    var title: String = "",

    @Column(nullable = true)
    var providerId: String? = null,

    @Column(nullable = true)
    var model: String? = null,

    @Column(nullable = true, columnDefinition = "text")
    var workingDir: String? = null,

    @Column(nullable = true)
    var groupId: String? = null,

    @Column(nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var messages: JsonNode = emptyJsonArray(),

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

    fun toDomain(): AssistantSession = AssistantSession(
        id = this.id,
        userId = this.userId,
        title = this.title,
        providerId = this.providerId,
        model = this.model,
        workingDir = this.workingDir,
        groupId = this.groupId,
        messages = this.messages.toObject(),
        createdAt = this.createdAt,
        updatedAt = this.updatedAt,
    )
}

fun AssistantSession.toEntity(): AssistantSessionEntity = AssistantSessionEntity(
    id = this.id,
    userId = this.userId,
    title = this.title,
    providerId = this.providerId,
    model = this.model,
    workingDir = this.workingDir,
    groupId = this.groupId,
    messages = this.messages.toJsonNode(),
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
