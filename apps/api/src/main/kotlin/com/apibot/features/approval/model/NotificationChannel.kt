package com.apibot.features.approval.model

import com.apibot.features.approval.dto.NotificationChannelResponse
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue
import java.net.URI
import java.time.Instant
import java.util.UUID

enum class NotificationChannelKind(@JsonValue val value: String) {
    WEBHOOK("webhook"),
    ;

    companion object {
        @JsonCreator
        @JvmStatic
        fun fromValue(value: String): NotificationChannelKind =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unknown notification channel kind: $value")
    }
}

enum class NotificationChannelStatus(@JsonValue val value: String) {
    ACTIVE("active"),
    ERROR("error"),
    DISABLED("disabled"),
    ;

    companion object {
        @JsonCreator
        @JvmStatic
        fun fromValue(value: String): NotificationChannelStatus =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unknown notification channel status: $value")
    }
}

/**
 * Conexão de saída para avisar um checkpoint externamente (n8n → Teams, no v1 — ver
 * .specs/001-aprovacoes-externas-teams). `url` e o segredo de autenticação (`authSecretId`) nunca saem
 * em nenhuma resposta de API — `toResponse()` expõe só `hasUrl`/`urlHost` para conferência visual.
 */
data class NotificationChannel(
    val id: UUID = UUID.randomUUID(),
    val userId: UUID,
    val label: String,
    val kind: NotificationChannelKind = NotificationChannelKind.WEBHOOK,
    val url: String,
    val authSecretId: UUID? = null,
    val authHeaderName: String? = null,
    val status: NotificationChannelStatus = NotificationChannelStatus.ACTIVE,
    val lastTestedAt: Instant? = null,
    val lastError: String? = null,
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now(),
)

fun NotificationChannel.toResponse(): NotificationChannelResponse = NotificationChannelResponse(
    id = this.id,
    label = this.label,
    kind = this.kind,
    hasUrl = this.url.isNotBlank(),
    urlHost = runCatching { URI(this.url).host }.getOrNull(),
    authHeaderName = this.authHeaderName,
    status = this.status,
    lastTestedAt = this.lastTestedAt,
    lastError = this.lastError,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
