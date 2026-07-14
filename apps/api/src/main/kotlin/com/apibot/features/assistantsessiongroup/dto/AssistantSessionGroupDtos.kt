package com.apibot.features.assistantsessiongroup.dto

import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.util.UUID

@Schema(description = "Request to create a new assistant session group")
data class CreateAssistantSessionGroupRequest(
    @Schema(description = "Group name") @field:NotBlank(message = "Name is required") val name: String,
    @Schema(description = "Sort order") val sortOrder: Int = 0,
)

@Schema(description = "Request to update an assistant session group (partial patch)")
data class UpdateAssistantSessionGroupRequest(
    @Schema(description = "Group name") val name: String? = null,
    @Schema(description = "Sort order") val sortOrder: Int? = null,
)

@Schema(description = "Assistant session group")
data class AssistantSessionGroupResponse(
    @Schema(description = "Group ID") val id: UUID,
    @Schema(description = "Group name") val name: String,
    @Schema(description = "Sort order") val sortOrder: Int,
    @Schema(description = "Creation date") val createdAt: Instant,
    @Schema(description = "Last update date") val updatedAt: Instant,
)
