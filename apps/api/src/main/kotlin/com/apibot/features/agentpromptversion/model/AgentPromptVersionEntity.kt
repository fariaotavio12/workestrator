package com.apibot.features.agentpromptversion.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "agent_prompt_versions")
class AgentPromptVersionEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var userId: UUID,

    @Column(nullable = false)
    var squadId: UUID,

    @Column(nullable = false)
    var agentId: UUID,

    @Column(nullable = false)
    var version: Int = 1,

    @Column(nullable = false, columnDefinition = "text")
    var systemPrompt: String = "",

    @Column(nullable = true, columnDefinition = "text")
    var reason: String? = null,

    @Column(nullable = true)
    var sourceRunId: UUID? = null,

    @Column(nullable = true, columnDefinition = "text")
    var sourceRejectionId: String? = null,

    @Column(nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),
) {
    @PrePersist
    fun prePersist() {
        createdAt = Instant.now()
    }

    fun toDomain(): AgentPromptVersion = AgentPromptVersion(
        id = this.id,
        userId = this.userId,
        squadId = this.squadId,
        agentId = this.agentId,
        version = this.version,
        systemPrompt = this.systemPrompt,
        reason = this.reason,
        sourceRunId = this.sourceRunId,
        sourceRejectionId = this.sourceRejectionId,
        createdAt = this.createdAt,
    )
}

fun AgentPromptVersion.toEntity(): AgentPromptVersionEntity = AgentPromptVersionEntity(
    id = this.id,
    userId = this.userId,
    squadId = this.squadId,
    agentId = this.agentId,
    version = this.version,
    systemPrompt = this.systemPrompt,
    reason = this.reason,
    sourceRunId = this.sourceRunId,
    sourceRejectionId = this.sourceRejectionId,
    createdAt = this.createdAt,
)
