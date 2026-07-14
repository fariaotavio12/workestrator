package com.apibot.features.auth.dto

import io.swagger.v3.oas.annotations.media.Schema
import java.time.Instant
import java.util.UUID

@Schema(description = "Authenticated user data")
data class CurrentUserResponse(
    @Schema(description = "User ID") val userId: UUID,
    @Schema(description = "User name") val name: String,
    @Schema(description = "User email") val email: String,
    @Schema(description = "Profile image URL") val img: String?,
    @Schema(description = "Whether the user is active") val isActive: Boolean,
    @Schema(description = "Creation date") val createdAt: Instant,
    @Schema(description = "Last update date") val updatedAt: Instant,
)
