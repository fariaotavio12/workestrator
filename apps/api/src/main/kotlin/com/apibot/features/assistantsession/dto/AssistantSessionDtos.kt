package com.apibot.features.assistantsession.dto

import com.apibot.features.assistantsession.model.Message
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.util.UUID

@Schema(description = "Request to create a new assistant session")
data class CreateAssistantSessionRequest(
    @Schema(description = "Session title") @field:NotBlank(message = "Title is required") val title: String,
    @Schema(description = "Model provider ID") val providerId: String? = null,
    @Schema(description = "Model name") val model: String? = null,
    @Schema(description = "Working directory chosen for execution mode") val workingDir: String? = null,
    @Schema(description = "Group ID this session belongs to") val groupId: String? = null,
    @Schema(description = "Conversation messages") val messages: List<Message> = emptyList(),
)

@Schema(description = "Request to move a session into a group (or remove it with null)")
data class SetAssistantSessionGroupRequest(
    @Schema(description = "Target group ID, or null to remove from any group") val groupId: String? = null,
)

@Schema(description = "Request to update an assistant session (partial patch)")
data class UpdateAssistantSessionRequest(
    @Schema(description = "Session title") val title: String? = null,
    @Schema(description = "Model provider ID") val providerId: String? = null,
    @Schema(description = "Model name") val model: String? = null,
    @Schema(description = "Working directory chosen for execution mode") val workingDir: String? = null,
    @Schema(description = "Conversation messages") val messages: List<Message>? = null,
)

@Schema(description = "Assistant session summary — used for list views, excludes messages")
data class AssistantSessionSummaryResponse(
    @Schema(description = "Session ID") val id: UUID,
    @Schema(description = "Session title") val title: String,
    @Schema(description = "Model provider ID") val providerId: String?,
    @Schema(description = "Model name") val model: String?,
    @Schema(description = "Working directory") val workingDir: String?,
    @Schema(description = "Group ID") val groupId: String?,
    @Schema(description = "Creation date") val createdAt: Instant,
    @Schema(description = "Last update date") val updatedAt: Instant,
)

@Schema(description = "Complete assistant session — used for detail views, includes messages")
data class AssistantSessionResponse(
    @Schema(description = "Session ID") val id: UUID,
    @Schema(description = "Session title") val title: String,
    @Schema(description = "Model provider ID") val providerId: String?,
    @Schema(description = "Model name") val model: String?,
    @Schema(description = "Working directory") val workingDir: String?,
    @Schema(description = "Group ID") val groupId: String?,
    @Schema(description = "Conversation messages") val messages: List<Message>,
    @Schema(description = "Creation date") val createdAt: Instant,
    @Schema(description = "Last update date") val updatedAt: Instant,
)
