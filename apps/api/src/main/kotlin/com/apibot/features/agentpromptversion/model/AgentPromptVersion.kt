package com.apibot.features.agentpromptversion.model

import com.apibot.features.agentpromptversion.dto.AgentPromptVersionResponse
import java.time.Instant
import java.util.UUID

/**
 * Uma versão anterior do `systemPrompt` de um agente. Guardar o texto **anterior** (e não o novo) é o
 * que torna a reversão exata: restaurar é copiar este campo de volta.
 */
data class AgentPromptVersion(
    val id: UUID = UUID.randomUUID(),
    val userId: UUID,
    val squadId: UUID,
    val agentId: UUID,
    /** Sequencial por agente — a primeira alteração gera a versão 1. */
    val version: Int,
    val systemPrompt: String,
    val reason: String? = null,
    val sourceRunId: UUID? = null,
    /** Id da reprovação que originou a alteração. É `text` porque a reprovação vive no `jsonb` do run. */
    val sourceRejectionId: String? = null,
    val createdAt: Instant = Instant.now(),
)

fun AgentPromptVersion.toResponse(): AgentPromptVersionResponse = AgentPromptVersionResponse(
    id = this.id,
    squadId = this.squadId,
    agentId = this.agentId,
    version = this.version,
    systemPrompt = this.systemPrompt,
    reason = this.reason,
    sourceRunId = this.sourceRunId,
    sourceRejectionId = this.sourceRejectionId,
    createdAt = this.createdAt,
)
