package com.apibot.features.auth.dto

import io.swagger.v3.oas.annotations.media.Schema
import java.time.Instant
import java.util.UUID

@Schema(name = "AuthResponse", description = "Authentication response with Bearer token and user data")
data class AuthResponse(
    @Schema(description = "User ID") val userId: UUID,
    @Schema(description = "User email") val email: String,
    @Schema(description = "User name") val name: String,
    @Schema(description = "User profile image URL") val img: String? = null,
    @Schema(description = "Whether the user is active") val isActive: Boolean,
    @Schema(description = "Bearer token for mobile authentication") val token: String,
    @Schema(description = "Token expiration date") val tokenExpiresAt: Instant,
    @Schema(description = "Creation date") val createdAt: Instant,
    @Schema(description = "Last update date") val updatedAt: Instant,
    @Schema(description = "Response message") val message: String,
)
