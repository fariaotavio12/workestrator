package com.apibot.features.auth.dto

import io.swagger.v3.oas.annotations.media.Schema

@Schema(description = "Password recovery operation response")
data class PasswordRecoveryResponse(
    @Schema(description = "Response message") val message: String,
)

