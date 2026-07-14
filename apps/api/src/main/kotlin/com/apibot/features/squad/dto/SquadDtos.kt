package com.apibot.features.squad.dto

import com.apibot.features.agent.dto.AgentResponse
import com.apibot.features.seat.dto.SeatResponse
import com.fasterxml.jackson.databind.JsonNode
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.util.UUID

@Schema(description = "Request to create a new squad")
data class CreateSquadRequest(
    @Schema(description = "Squad name") @field:NotBlank(message = "Name is required") val name: String,
    @Schema(description = "Description") val description: String = "",
    @Schema(description = "Icon identifier") val icon: String = "",
    @Schema(description = "Execution trigger") val trigger: JsonNode? = null,
    @Schema(description = "Orchestrator system prompt") val orchSystemPrompt: String = "",
    @Schema(description = "Orchestrator model provider ID") val orchProviderId: UUID? = null,
    @Schema(description = "Orchestrator model name") val orchModel: String? = null,
    @Schema(description = "Max orchestration steps per run") val orchMaxSteps: Int = 20,
    @Schema(description = "Whether the coordinator sees a summary of previous runs") val orchUseRunHistory: Boolean = false,
)

@Schema(description = "Request to update squad-level fields")
data class UpdateSquadRequest(
    @Schema(description = "Squad name") val name: String? = null,
    @Schema(description = "Description") val description: String? = null,
    @Schema(description = "Icon identifier") val icon: String? = null,
    @Schema(description = "Execution trigger") val trigger: JsonNode? = null,
    @Schema(description = "Orchestrator system prompt") val orchSystemPrompt: String? = null,
    @Schema(description = "Saved briefing — prefills the run dialog and feeds scheduled runs") val savedBriefing: String? = null,
    @Schema(description = "Orchestrator model provider ID") val orchProviderId: UUID? = null,
    @Schema(description = "Orchestrator model name") val orchModel: String? = null,
    @Schema(description = "Max orchestration steps per run") val orchMaxSteps: Int? = null,
    @Schema(description = "Whether the coordinator sees a summary of previous runs") val orchUseRunHistory: Boolean? = null,
)

@Schema(description = "Squad summary — used for list views, excludes agents and seats")
data class SquadSummaryResponse(
    @Schema(description = "Squad ID") val id: UUID,
    @Schema(description = "Squad name") val name: String,
    @Schema(description = "Description") val description: String,
    @Schema(description = "Icon identifier") val icon: String,
    @Schema(description = "Execution trigger") val trigger: JsonNode,
    @Schema(description = "Creation date") val createdAt: Instant,
    @Schema(description = "Last update date") val updatedAt: Instant,
)

@Schema(description = "Complete squad — used for detail views, includes agents and seats")
data class SquadDetailResponse(
    @Schema(description = "Squad ID") val id: UUID,
    @Schema(description = "Squad name") val name: String,
    @Schema(description = "Description") val description: String,
    @Schema(description = "Icon identifier") val icon: String,
    @Schema(description = "Execution trigger") val trigger: JsonNode,
    @Schema(description = "Orchestrator system prompt") val orchSystemPrompt: String,
    @Schema(description = "Saved briefing — prefills the run dialog and feeds scheduled runs") val savedBriefing: String?,
    @Schema(description = "Orchestrator model provider ID") val orchProviderId: UUID?,
    @Schema(description = "Orchestrator model name") val orchModel: String?,
    @Schema(description = "Max orchestration steps per run") val orchMaxSteps: Int,
    @Schema(description = "Whether the coordinator sees a summary of previous runs") val orchUseRunHistory: Boolean,
    @Schema(description = "Agents belonging to this squad") val agents: List<AgentResponse>,
    @Schema(description = "Seats belonging to this squad") val seats: List<SeatResponse>,
    @Schema(description = "Creation date") val createdAt: Instant,
    @Schema(description = "Last update date") val updatedAt: Instant,
)
