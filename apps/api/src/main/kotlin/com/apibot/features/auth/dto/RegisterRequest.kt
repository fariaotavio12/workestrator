package com.apibot.features.auth.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class RegisterRequest(
    @field:NotBlank(message = "Nome é obrigatório")
    @field:Size(min = 3, max = 100, message = "Nome deve ter entre 3 e 100 caracteres")
    val name: String,

    @field:NotBlank(message = "Email é obrigatório")
    @field:Email(message = "Email deve ser válido")
    val email: String,

    @field:NotBlank(message = "Senha é obrigatória")
    @field:Size(min = 6, message = "Senha deve ter no mínimo 6 caracteres")
    val password: String,
)
