package com.apibot.features.agent.model

import com.apibot.features.agent.dto.AgentResponse
import java.time.Instant
import java.util.UUID

data class AgentAuthBinding(
    val scriptId: UUID,
    val authSlot: String,
    val connectionId: UUID,
    val alias: String,
    val isDefault: Boolean = true,
)

data class Agent(
    val id: UUID = UUID.randomUUID(),
    val squadId: UUID,
    val userId: UUID,
    val name: String,
    val role: String = "",
    val systemPrompt: String = "",
    val providerId: UUID? = null,
    val model: String? = null,
    val scriptIds: List<UUID> = emptyList(),
    /** Bases de conhecimento (RAG) que este agente consulta durante o run — ver feature `knowledge`. */
    val knowledgeCollectionIds: List<UUID> = emptyList(),
    val authBindings: List<AgentAuthBinding> = emptyList(),
    val canExecute: Boolean = false,
    val requiresCheckpoint: Boolean = false,
    val requiresCheckpointAfter: Boolean = false,
    val character: String = "Male1",
    val gender: String = "male",
    val accentColor: String = "",
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now(),
)

fun Agent.toResponse(): AgentResponse = AgentResponse(
    id = this.id,
    squadId = this.squadId,
    name = this.name,
    role = this.role,
    systemPrompt = this.systemPrompt,
    providerId = this.providerId,
    model = this.model,
    scriptIds = this.scriptIds,
    knowledgeCollectionIds = this.knowledgeCollectionIds,
    authBindings = this.authBindings,
    canExecute = this.canExecute,
    requiresCheckpoint = this.requiresCheckpoint,
    requiresCheckpointAfter = this.requiresCheckpointAfter,
    character = this.character,
    gender = this.gender,
    accentColor = this.accentColor,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
