package com.apibot.features.secret.controller

import com.apibot.features.secret.dto.CreateSecretRequest
import com.apibot.features.secret.dto.SecretResponse
import com.apibot.features.secret.dto.SecretValueResponse
import com.apibot.features.secret.dto.UpdateSecretRequest
import com.apibot.features.secret.dto.UpdateSecretValueRequest
import com.apibot.features.secret.model.toResponse
import com.apibot.features.secret.service.SecretService
import com.apibot.security.GetUserId
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/secrets")
@Tag(name = "Secret")
@SecurityRequirement(name = "Bearer")
class SecretController(
    private val secretService: SecretService,
) {
    @PostMapping
    @Operation(summary = "Create a new secret, encrypting its value at rest")
    fun createSecret(
        @GetUserId userId: String,
        @Valid @RequestBody request: CreateSecretRequest,
    ): ResponseEntity<SecretResponse> {
        val secret = secretService.createSecret(UUID.fromString(userId), request)
        return ResponseEntity.status(HttpStatus.CREATED).body(secret.toResponse())
    }

    @GetMapping
    @Operation(summary = "List secrets of the authenticated user — never includes the value")
    fun listSecrets(@GetUserId userId: String): ResponseEntity<List<SecretResponse>> {
        val secrets = secretService.listSecrets(UUID.fromString(userId))
        return ResponseEntity.ok(secrets.map { it.toResponse() })
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a secret by ID — never includes the value")
    fun getSecret(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<SecretResponse> {
        val secret = secretService.getSecretForUser(UUID.fromString(userId), id)
        return ResponseEntity.ok(secret.toResponse())
    }

    @GetMapping("/{id}/value")
    @Operation(
        summary = "Resolve the decrypted value of a secret",
        description = "Meant to be called by the local runner at execution time — never by the browser.",
    )
    fun getSecretValue(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<SecretValueResponse> {
        val value = secretService.resolveValue(UUID.fromString(userId), id)
        return ResponseEntity.ok(value)
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a secret's label/authType/metadata — never the value")
    fun updateSecret(
        @GetUserId userId: String,
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateSecretRequest,
    ): ResponseEntity<SecretResponse> {
        val secret = secretService.updateSecret(UUID.fromString(userId), id, request)
        return ResponseEntity.ok(secret.toResponse())
    }

    @PutMapping("/{id}/value")
    @Operation(summary = "Rotate a secret's value, encrypting it at rest")
    fun updateSecretValue(
        @GetUserId userId: String,
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateSecretValueRequest,
    ): ResponseEntity<SecretResponse> {
        val secret = secretService.updateSecretValue(UUID.fromString(userId), id, request)
        return ResponseEntity.ok(secret.toResponse())
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a secret")
    fun deleteSecret(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<Void> {
        secretService.deleteSecret(UUID.fromString(userId), id)
        return ResponseEntity.noContent().build()
    }
}
