package com.apibot.features.auth.controller

import com.apibot.features.auth.dto.ForgotPasswordRequest
import com.apibot.features.auth.dto.ResetPasswordRequest
import com.apibot.features.auth.dto.PasswordRecoveryResponse
import com.apibot.features.auth.service.PasswordRecoveryService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping(value = ["/auth/password"])
@Tag(name = "Authentication")
class PasswordRecoveryController(
    private val passwordRecoveryService: PasswordRecoveryService,
) {

    @PostMapping("/forgot")
    @Operation(
        summary = "Request password recovery",
        description = "Sends a recovery code to the user's email address",
    )
    fun forgotPassword(
        @Valid @RequestBody request: ForgotPasswordRequest,
    ): ResponseEntity<PasswordRecoveryResponse> {
        passwordRecoveryService.requestPasswordReset(request.email)
        
        return ResponseEntity.ok(
            PasswordRecoveryResponse(
                message = "Se o email existir em nosso sistema, você receberá instruções para resetar sua senha",
            ),
        )
    }

    @PostMapping("/reset")
    @Operation(
        summary = "Reset password with valid code",
        description = "Resets the user's password using the code sent by email",
    )
    fun resetPassword(
        @Valid @RequestBody request: ResetPasswordRequest,
    ): ResponseEntity<PasswordRecoveryResponse> {
        passwordRecoveryService.resetPassword(request.code, request.newPassword)
        
        return ResponseEntity.ok(
            PasswordRecoveryResponse(
                message = "Senha resetada com sucesso. Você pode fazer login com sua nova senha",
            ),
        )
    }
}

