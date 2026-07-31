package com.apibot.features.approval.dto

import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.util.UUID

@Schema(description = "Request to invite an existing Workestrator account to a squad's approver pool")
data class InviteSquadApproverRequest(
    @field:NotBlank(message = "Email is required")
    @field:Email(message = "Email must be valid")
    @Schema(description = "Email of an existing Workestrator account", example = "ana@empresa.com")
    val email: String,
)

@Schema(description = "Squad approver pool entry")
data class SquadApproverResponse(
    @Schema(description = "Pool entry ID") val id: UUID,
    @Schema(description = "Approver's user ID") val approverUserId: UUID,
    @Schema(description = "Approver's email") val email: String,
    @Schema(description = "Approver's display name") val displayName: String,
    @Schema(description = "When the approver was invited") val invitedAt: Instant,
)
