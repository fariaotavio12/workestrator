package com.apibot.features.agent.model

import com.apibot.shared.extensions.toJsonNode
import com.apibot.shared.extensions.toObject
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
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

private val emptyIdsNode: JsonNode = jacksonObjectMapper().createArrayNode()

@Entity
@Table(name = "agents")
class AgentEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var squadId: UUID,

    @Column(nullable = false)
    var userId: UUID,

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = false, columnDefinition = "text")
    var role: String = "",

    @Column(nullable = false, columnDefinition = "text")
    var systemPrompt: String = "",

    @Column(nullable = true)
    var providerId: UUID? = null,

    @Column(nullable = true)
    var model: String? = null,

    @Column(nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var scriptIds: JsonNode = emptyIdsNode,

    // default '[]' garante que o `ddl-auto=update` consiga adicionar esta coluna NOT NULL a uma tabela
    // `agents` que já tenha linhas (agentes criados antes do RAG).
    @Column(nullable = false, columnDefinition = "jsonb default '[]'::jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var knowledgeCollectionIds: JsonNode = emptyIdsNode,

    @Column(nullable = false, columnDefinition = "jsonb default '[]'::jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var authBindings: JsonNode = emptyIdsNode,

    @Column(nullable = false)
    var canExecute: Boolean = false,

    @Column(nullable = false)
    var requiresCheckpoint: Boolean = false,

    // default 'false' garante que o `ddl-auto=update` consiga adicionar esta coluna NOT NULL a uma tabela
    // `agents` que já tenha linhas.
    @Column(nullable = false, columnDefinition = "boolean default false")
    var requiresCheckpointAfter: Boolean = false,

    @Column(nullable = false)
    var character: String = "Male1",

    @Column(nullable = false)
    var gender: String = "male",

    @Column(nullable = false)
    var accentColor: String = "",

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

    fun toDomain(): Agent = Agent(
        id = this.id,
        squadId = this.squadId,
        userId = this.userId,
        name = this.name,
        role = this.role,
        systemPrompt = this.systemPrompt,
        providerId = this.providerId,
        model = this.model,
        scriptIds = this.scriptIds.toObject(),
        knowledgeCollectionIds = this.knowledgeCollectionIds.toObject(),
        authBindings = this.authBindings.toObject(),
        canExecute = this.canExecute,
        requiresCheckpoint = this.requiresCheckpoint,
        requiresCheckpointAfter = this.requiresCheckpointAfter,
        character = this.character,
        gender = this.gender,
        accentColor = this.accentColor,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt,
    )
}

fun Agent.toEntity(): AgentEntity = AgentEntity(
    id = this.id,
    squadId = this.squadId,
    userId = this.userId,
    name = this.name,
    role = this.role,
    systemPrompt = this.systemPrompt,
    providerId = this.providerId,
    model = this.model,
    scriptIds = this.scriptIds.toJsonNode(),
    knowledgeCollectionIds = this.knowledgeCollectionIds.toJsonNode(),
    authBindings = this.authBindings.toJsonNode(),
    canExecute = this.canExecute,
    requiresCheckpoint = this.requiresCheckpoint,
    requiresCheckpointAfter = this.requiresCheckpointAfter,
    character = this.character,
    gender = this.gender,
    accentColor = this.accentColor,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
