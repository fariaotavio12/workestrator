package com.apibot.features.user.dto

import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.util.UUID

@Schema(description = "Request to create a new user")
data class CreateUserRequest(
    @Schema(description = "User full name")
    @field:NotBlank(message = "Name is required")
    val name: String,

    @Schema(description = "User email address")
    @field:NotBlank(message = "Email is required")
    @field:Email(message = "Email must be valid")
    val email: String,

    @Schema(description = "User password")
    @field:NotBlank(message = "Password is required")
    val password: String,
)

@Schema(description = "Request to update an existing user")
data class UpdateUserRequest(
    @Schema(description = "User full name")
    @field:NotBlank(message = "Name is required")
    val name: String? = null,
    @Schema(description = "Whether the user is active") val isActive: Boolean? = null,
    @Schema(description = "Profile image URL") val img: String? = null,
)

@Schema(description = "User data response")
data class UserResponse(
    @Schema(description = "User ID") val id: UUID,
    @Schema(description = "User name") val name: String,
    @Schema(description = "User email") val email: String,
    @Schema(description = "Whether the user is active") val isActive: Boolean,
    @Schema(description = "Creation date") val createdAt: Instant,
    @Schema(description = "Last update date") val updatedAt: Instant,
)
