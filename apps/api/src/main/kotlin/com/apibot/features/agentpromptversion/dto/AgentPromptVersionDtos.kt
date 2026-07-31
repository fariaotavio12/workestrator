package com.apibot.features.agentpromptversion.dto

import io.swagger.v3.oas.annotations.media.Schema
import java.time.Instant
import java.util.UUID

@Schema(description = "A previous version of an agent's system prompt")
data class AgentPromptVersionResponse(
    @Schema(description = "Version ID") val id: UUID,
    @Schema(description = "Owning squad ID") val squadId: UUID,
    @Schema(description = "Owning agent ID") val agentId: UUID,
    @Schema(description = "Sequential version number for this agent") val version: Int,
    @Schema(description = "The system prompt text as it was before the change") val systemPrompt: String,
    @Schema(description = "Why the prompt was changed") val reason: String?,
    @Schema(description = "Run that originated the change") val sourceRunId: UUID?,
    @Schema(description = "Rejection that originated the change") val sourceRejectionId: String?,
    @Schema(description = "Creation date") val createdAt: Instant,
)
