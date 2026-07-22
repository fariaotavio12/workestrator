package com.apibot.features.agent.dto

import com.apibot.features.agent.model.AgentAuthBinding
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.util.UUID

@Schema(description = "Request to add an agent to a squad")
data class CreateAgentRequest(
    @Schema(description = "Agent name") @field:NotBlank(message = "Name is required") val name: String,
    @Schema(description = "Agent role") val role: String = "",
    @Schema(description = "System prompt") val systemPrompt: String = "",
    @Schema(description = "Model provider ID") val providerId: UUID? = null,
    @Schema(description = "Model name") val model: String? = null,
    @Schema(description = "Referenced script IDs") val scriptIds: List<UUID> = emptyList(),
    @Schema(description = "Knowledge collection IDs this agent retrieves from (RAG)") val knowledgeCollectionIds: List<UUID> = emptyList(),
    @Schema(description = "Authentication connections allowed for each agent tool slot") val authBindings: List<AgentAuthBinding> = emptyList(),
    @Schema(description = "Whether the agent can run scripts for real") val canExecute: Boolean = false,
    @Schema(description = "Whether the run pauses for approval before this agent") val requiresCheckpoint: Boolean = false,
    @Schema(description = "Whether the run pauses for approval after this agent produces output") val requiresCheckpointAfter: Boolean = false,
    @Schema(description = "Character sprite name") val character: String = "Male1",
    @Schema(description = "Character gender") val gender: String = "male",
    @Schema(description = "Accent color") val accentColor: String = "",
)

@Schema(description = "Request to update an agent")
data class UpdateAgentRequest(
    @Schema(description = "Agent name") val name: String? = null,
    @Schema(description = "Agent role") val role: String? = null,
    @Schema(description = "System prompt") val systemPrompt: String? = null,
    @Schema(description = "Model provider ID") val providerId: UUID? = null,
    @Schema(description = "Model name") val model: String? = null,
    @Schema(description = "Referenced script IDs") val scriptIds: List<UUID>? = null,
    @Schema(description = "Knowledge collection IDs this agent retrieves from (RAG)") val knowledgeCollectionIds: List<UUID>? = null,
    @Schema(description = "Authentication connections allowed for each agent tool slot") val authBindings: List<AgentAuthBinding>? = null,
    @Schema(description = "Whether the agent can run scripts for real") val canExecute: Boolean? = null,
    @Schema(description = "Whether the run pauses for approval before this agent") val requiresCheckpoint: Boolean? = null,
    @Schema(description = "Whether the run pauses for approval after this agent produces output") val requiresCheckpointAfter: Boolean? = null,
    @Schema(description = "Character sprite name") val character: String? = null,
    @Schema(description = "Character gender") val gender: String? = null,
    @Schema(description = "Accent color") val accentColor: String? = null,
)

@Schema(description = "Agent response")
data class AgentResponse(
    @Schema(description = "Agent ID") val id: UUID,
    @Schema(description = "Owning squad ID") val squadId: UUID,
    @Schema(description = "Agent name") val name: String,
    @Schema(description = "Agent role") val role: String,
    @Schema(description = "System prompt") val systemPrompt: String,
    @Schema(description = "Model provider ID") val providerId: UUID?,
    @Schema(description = "Model name") val model: String?,
    @Schema(description = "Referenced script IDs") val scriptIds: List<UUID>,
    @Schema(description = "Knowledge collection IDs this agent retrieves from (RAG)") val knowledgeCollectionIds: List<UUID>,
    @Schema(description = "Authentication connections allowed for each agent tool slot") val authBindings: List<AgentAuthBinding>,
    @Schema(description = "Whether the agent can run scripts for real") val canExecute: Boolean,
    @Schema(description = "Whether the run pauses for approval before this agent") val requiresCheckpoint: Boolean,
    @Schema(description = "Whether the run pauses for approval after this agent produces output") val requiresCheckpointAfter: Boolean,
    @Schema(description = "Character sprite name") val character: String,
    @Schema(description = "Character gender") val gender: String,
    @Schema(description = "Accent color") val accentColor: String,
    @Schema(description = "Creation date") val createdAt: Instant,
    @Schema(description = "Last update date") val updatedAt: Instant,
)
