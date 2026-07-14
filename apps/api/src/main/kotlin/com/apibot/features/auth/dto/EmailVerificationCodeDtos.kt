package com.apibot.features.auth.dto

import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank

@Schema(description = "Request to send an email verification code")
data class SendEmailVerificationCodeRequest(
    @Schema(description = "User email address")
    @field:NotBlank(message = "Email is required")
    @field:Email(message = "Email must be valid")
    val email: String,
)

@Schema(description = "Response after sending an email verification code")
data class SendEmailVerificationCodeResponse(
    @Schema(description = "Email address the code was sent to") val email: String,
    @Schema(description = "Response message") val message: String,
    @Schema(description = "Code expiration time in seconds") val expiresInSeconds: Long,
)
