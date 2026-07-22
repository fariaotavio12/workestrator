package com.apibot.features.secret.model

import com.apibot.features.secret.dto.SecretResponse
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue
import java.time.Instant
import java.util.UUID

/**
 * How the resolved value is injected into a request (see docs/plano-integracoes-e-flow-builder.md
 * §8.3). `metadata` on `Secret` carries the non-sensitive parameters each scheme needs
 * (`headerName`/`valuePrefix` for `HEADER`, `queryParam` for `QUERY`, `basicUsername` for `BASIC`,
 * `tokenUrl`/`clientId`/`scopes` for the `OAUTH2_*` schemes). `RAW` is the escape hatch: the runner
 * substitutes a `"$label"` placeholder anywhere in a header/env value, same as before this scheme existed.
 */
enum class SecretAuthType(@JsonValue val value: String) {
    BEARER("bearer"),
    HEADER("header"),
    QUERY("query"),
    BASIC("basic"),
    OAUTH2_CLIENT_CREDENTIALS("oauth2_client_credentials"),
    OAUTH2_REFRESH("oauth2_refresh"),
    RAW("raw"),
    ;

    companion object {
        @JsonCreator
        @JvmStatic
        fun fromValue(value: String): SecretAuthType =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unknown secret auth type: $value")
    }
}

enum class AuthConnectionStatus(@JsonValue val value: String) {
    CONNECTED("connected"),
    EXPIRED("expired"),
    REVOKED("revoked"),
    ERROR("error"),
    ;

    companion object {
        @JsonCreator
        @JvmStatic
        fun fromValue(value: String): AuthConnectionStatus =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unknown auth connection status: $value")
    }
}

/**
 * Credential reference used by `Provider.apiKeyRef` and `Script.authRef` (by `id`). The value lives
 * encrypted at rest (`valueCiphertext`, AES-256-GCM via `SecretCipher`) — `GET` endpoints never return
 * it, only `GET /secrets/{id}/value` does, scoped to the owning user, meant to be called by the local
 * runner at execution time (never by the browser). `metadata` is non-sensitive and parametrizes
 * `authType` (see `SecretAuthType`).
 */
data class Secret(
    val id: UUID = UUID.randomUUID(),
    val userId: UUID,
    val label: String,
    val authType: SecretAuthType,
    val metadata: Map<String, String>? = null,
    val valueCiphertext: String? = null,
    /**
     * Id do preset do catálogo de conectores (ver front `connectors-catalog.ts`) que originou este
     * secret — ex. "google", "slack". Puramente informativo para a UI mapear status de conexão por
     * conector; nunca interpretado pelo runner. Não confundir com `metadata`: chaves ali fora do
     * conjunto conhecido viram headers fixos enviados nas requisições (ver `KNOWN_AUTH_METADATA_KEYS`).
     */
    val connectorId: String? = null,
    val accountExternalId: String? = null,
    val accountDisplayName: String? = null,
    val scopes: List<String> = emptyList(),
    val status: AuthConnectionStatus = AuthConnectionStatus.CONNECTED,
    val expiresAt: Instant? = null,
    val lastValidatedAt: Instant? = null,
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now(),
)

fun Secret.toResponse(): SecretResponse = SecretResponse(
    id = this.id,
    label = this.label,
    authType = this.authType,
    metadata = this.metadata,
    connectorId = this.connectorId,
    accountExternalId = this.accountExternalId,
    accountDisplayName = this.accountDisplayName,
    scopes = this.scopes,
    status = this.status,
    expiresAt = this.expiresAt,
    lastValidatedAt = this.lastValidatedAt,
    hasValue = this.valueCiphertext != null,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
