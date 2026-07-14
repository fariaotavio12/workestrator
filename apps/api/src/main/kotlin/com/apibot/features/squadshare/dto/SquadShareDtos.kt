package com.apibot.features.squadshare.dto

import io.swagger.v3.oas.annotations.media.Schema
import java.time.Instant
import java.util.UUID

@Schema(description = "Share link created for a squad — owner-only, returned right after creation")
data class SquadShareResponse(
    @Schema(description = "Opaque token used in the public share URL") val token: String,
    @Schema(description = "Squad this share points to") val squadId: UUID,
    @Schema(description = "Whether the share was revoked") val revoked: Boolean,
    @Schema(description = "How many times this share has been accepted") val acceptCount: Int,
    @Schema(description = "Creation date") val createdAt: Instant,
)

@Schema(description = "Agent summary shown in the public preview, before the viewer accepts the share")
data class SharedAgentPreviewResponse(
    @Schema(description = "Agent name") val name: String,
    @Schema(description = "Agent role") val role: String,
    @Schema(description = "Character sprite name") val character: String,
    @Schema(description = "Character gender") val gender: String,
    @Schema(description = "Accent color") val accentColor: String,
)

@Schema(description = "Public, unauthenticated preview of a shared squad — no prompts or scripts, only enough to decide whether to accept")
data class SquadSharePreviewResponse(
    @Schema(description = "Squad name") val name: String,
    @Schema(description = "Description") val description: String,
    @Schema(description = "Icon identifier") val icon: String,
    @Schema(description = "Number of agents in the squad") val agentCount: Int,
    @Schema(description = "Number of tools/scripts referenced by the squad's agents") val scriptCount: Int,
    @Schema(description = "Agent summaries") val agents: List<SharedAgentPreviewResponse>,
)

@Schema(description = "Result of accepting a share — the new squad created in the accepting user's account")
data class AcceptShareResponse(
    @Schema(description = "ID of the squad created for the accepting user") val squadId: UUID,
)
