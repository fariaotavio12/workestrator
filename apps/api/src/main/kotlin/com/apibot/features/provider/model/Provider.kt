package com.apibot.features.provider.model

import com.apibot.features.provider.dto.ProviderResponse
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue
import java.time.Instant
import java.util.UUID

data class ProviderModelOption(
    val value: String,
    val label: String,
)

enum class ProviderKind(@JsonValue val value: String) {
    CLAUDE_CLI("claude-cli"),
    CODEX_CLI("codex-cli"),
    GPT_CLI("gpt-cli"),
    ANTHROPIC_API("anthropic-api"),
    OPENAI("openai"),
    OPENAI_COMPAT("openai-compat"),
    ;

    companion object {
        @JsonCreator
        @JvmStatic
        fun fromValue(value: String): ProviderKind =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unknown provider kind: $value")
    }
}

data class Provider(
    val id: UUID = UUID.randomUUID(),
    val userId: UUID,
    val label: String,
    val kind: ProviderKind,
    val baseUrl: String? = null,
    val apiKeyRef: String? = null,
    val models: List<ProviderModelOption> = emptyList(),
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now(),
)

fun Provider.toResponse(): ProviderResponse = ProviderResponse(
    id = this.id,
    label = this.label,
    kind = this.kind,
    baseUrl = this.baseUrl,
    apiKeyRef = this.apiKeyRef,
    models = this.models,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
