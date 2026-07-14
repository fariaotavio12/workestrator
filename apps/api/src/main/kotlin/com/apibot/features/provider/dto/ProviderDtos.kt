package com.apibot.features.provider.dto

import com.apibot.features.provider.model.ProviderKind
import com.apibot.features.provider.model.ProviderModelOption
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.util.UUID

@Schema(description = "Request to create a new model provider")
data class CreateProviderRequest(
    @Schema(description = "Display label") @field:NotBlank(message = "Label is required") val label: String,
    @Schema(description = "Provider kind") val kind: ProviderKind,
    @Schema(description = "Custom base URL (openai-compat only)") val baseUrl: String? = null,
    @Schema(description = "Reference to the stored API key, never the raw value") val apiKeyRef: String? = null,
    @Schema(description = "Selectable model options") val models: List<ProviderModelOption> = emptyList(),
)

@Schema(description = "Request to update an existing model provider")
data class UpdateProviderRequest(
    @Schema(description = "Display label") val label: String? = null,
    @Schema(description = "Provider kind") val kind: ProviderKind? = null,
    @Schema(description = "Custom base URL (openai-compat only)") val baseUrl: String? = null,
    @Schema(description = "Reference to the stored API key, never the raw value") val apiKeyRef: String? = null,
    @Schema(description = "Selectable model options") val models: List<ProviderModelOption>? = null,
)

@Schema(description = "Model provider response")
data class ProviderResponse(
    @Schema(description = "Provider ID") val id: UUID,
    @Schema(description = "Display label") val label: String,
    @Schema(description = "Provider kind") val kind: ProviderKind,
    @Schema(description = "Custom base URL (openai-compat only)") val baseUrl: String?,
    @Schema(description = "Reference to the stored API key, never the raw value") val apiKeyRef: String?,
    @Schema(description = "Selectable model options") val models: List<ProviderModelOption>,
    @Schema(description = "Creation date") val createdAt: Instant,
    @Schema(description = "Last update date") val updatedAt: Instant,
)
