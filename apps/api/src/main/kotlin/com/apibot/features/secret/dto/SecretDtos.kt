package com.apibot.features.secret.dto

import com.apibot.features.secret.model.SecretAuthType
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.util.UUID

@Schema(description = "Request to create a new secret, value included")
data class CreateSecretRequest(
    @Schema(description = "Reference label") @field:NotBlank(message = "Label is required") val label: String,
    @Schema(description = "How the value is injected into a request") val authType: SecretAuthType,
    @Schema(description = "Non-sensitive parameters for the auth scheme (headerName, queryParam, tokenUrl, ...)")
    val metadata: Map<String, String>? = null,
    @Schema(description = "Raw credential value — encrypted at rest, never echoed back")
    @field:NotBlank(message = "Value is required")
    val value: String,
    @Schema(description = "Connector catalog preset id that originated this secret (e.g. \"google\") — informational only")
    val connectorId: String? = null,
)

@Schema(description = "Request to update a secret's label/authType/metadata — never the value")
data class UpdateSecretRequest(
    @Schema(description = "Reference label") @field:NotBlank(message = "Label is required") val label: String,
    @Schema(description = "How the value is injected into a request") val authType: SecretAuthType,
    @Schema(description = "Non-sensitive parameters for the auth scheme") val metadata: Map<String, String>? = null,
    @Schema(description = "Connector catalog preset id that originated this secret (e.g. \"google\") — informational only")
    val connectorId: String? = null,
)

@Schema(description = "Request to rotate a secret's value")
data class UpdateSecretValueRequest(
    @Schema(description = "New raw credential value — encrypted at rest, never echoed back")
    @field:NotBlank(message = "Value is required")
    val value: String,
)

@Schema(description = "Secret reference response — the raw value is never included, only whether one is set")
data class SecretResponse(
    @Schema(description = "Secret ID") val id: UUID,
    @Schema(description = "Reference label") val label: String,
    @Schema(description = "How the value is injected into a request") val authType: SecretAuthType,
    @Schema(description = "Non-sensitive parameters for the auth scheme") val metadata: Map<String, String>?,
    @Schema(description = "Connector catalog preset id that originated this secret (e.g. \"google\") — informational only")
    val connectorId: String?,
    @Schema(description = "Whether a value has been set for this secret") val hasValue: Boolean,
    @Schema(description = "Creation date") val createdAt: Instant,
    @Schema(description = "Last update date") val updatedAt: Instant,
)

@Schema(
    description =
        "Resolved secret value — only returned by GET /secrets/{id}/value, meant to be called by the " +
            "local runner at execution time, never by the browser",
)
data class SecretValueResponse(
    @Schema(description = "Decrypted credential value") val value: String,
    @Schema(description = "How the value is injected into a request") val authType: SecretAuthType,
    @Schema(description = "Non-sensitive parameters for the auth scheme") val metadata: Map<String, String>?,
)
