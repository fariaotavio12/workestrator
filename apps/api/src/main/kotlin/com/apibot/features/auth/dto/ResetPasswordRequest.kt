package com.apibot.features.auth.dto

import com.fasterxml.jackson.annotation.JsonAlias
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

data class ResetPasswordRequest(
    @field:JsonAlias("token")
    @field:NotBlank(message = "Code is required")
    @field:Size(min = 6, max = 6, message = "Code must be 6 characters")
    @field:Pattern(regexp = "^[0-9]{6}$", message = "Code must contain only digits")
    val code: String,
    
    @field:NotBlank(message = "Password is required")
    @field:Size(min = 6, message = "Password must be at least 6 characters")
    val newPassword: String,
)

