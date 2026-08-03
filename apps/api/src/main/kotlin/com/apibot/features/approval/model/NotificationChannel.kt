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
 * .specs/001-aprovacoes-externas-teams). `toResponse()` expõe a `url` completa — o dono precisa dela pra
 * revisar/editar de verdade (a antiga política de nunca reexibi-la só atrapalhava o diagnóstico de erro
 * de conexão, sem ganho real de segurança: é o próprio dono lendo o que ele mesmo cadastrou). O segredo
 * do header de autenticação (`authSecretId`) continua nunca saindo em texto puro — esse sim é uma
 * credencial de terceiro, não um dado que o dono já conhece. `urlHost` (esquema+host+porta, ex.:
 * `https://192.168.228.14:5678`) continua existindo à parte pra listagens, sem precisar mandar a URL
 * inteira só pra exibir uma linha resumida.
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

private fun schemeHostPort(url: String): String? {
    val uri = URI(url)
    val host = uri.host ?: return null
    val portSuffix = if (uri.port >= 0) ":${uri.port}" else ""
    return "${uri.scheme}://$host$portSuffix"
}

fun NotificationChannel.toResponse(): NotificationChannelResponse = NotificationChannelResponse(
    id = this.id,
    label = this.label,
    kind = this.kind,
    hasUrl = this.url.isNotBlank(),
    url = this.url.takeIf { it.isNotBlank() },
    urlHost = runCatching { schemeHostPort(this.url) }.getOrNull(),
    authHeaderName = this.authHeaderName,
    status = this.status,
    lastTestedAt = this.lastTestedAt,
    lastError = this.lastError,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
