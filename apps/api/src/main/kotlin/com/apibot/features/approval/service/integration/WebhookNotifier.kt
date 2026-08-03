package com.apibot.features.approval.service.integration

import com.apibot.features.approval.config.ApprovalProperties
import com.apibot.features.approval.model.NotificationChannel
import com.apibot.features.secret.service.SecretService
import com.apibot.shared.extensions.sharedJsonMapper
import org.slf4j.LoggerFactory
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder
import org.springframework.boot.http.client.ClientHttpRequestFactorySettings
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException
import java.time.Duration
import java.util.UUID

sealed class NotificationOutcome {
    data object Success : NotificationOutcome()
    data class Failure(val message: String) : NotificationOutcome()
}

/**
 * Cliente HTTP de saída do aviso de checkpoint (n8n → Teams — ver .specs/001-aprovacoes-externas-teams,
 * "Contrato do payload"). Deliberadamente **não** reusa o `RestClient` compartilhado de
 * `oauth/config/RestClientConfig` — este precisa de timeout curto e dedicado (NFR "nunca bloqueia o
 * run"), enquanto aquele não tem timeout configurado. Uma tentativa, sem retry: falhar aqui só grava
 * `notifyError` no pedido, nunca afeta o run (`ApprovalService.create`).
 */
@Component
class WebhookNotifier(
    private val secretService: SecretService,
    private val properties: ApprovalProperties,
) {
    private val logger = LoggerFactory.getLogger(WebhookNotifier::class.java)

    private val restClient: RestClient = run {
        val settings = ClientHttpRequestFactorySettings.defaults()
            .withConnectTimeout(Duration.ofSeconds(properties.notifyConnectTimeoutSeconds))
            .withReadTimeout(Duration.ofSeconds(properties.notifyReadTimeoutSeconds))
        val requestFactory = ClientHttpRequestFactoryBuilder.detect().build(settings)
        RestClient.builder().requestFactory(requestFactory).build()
    }

    fun send(userId: UUID, channel: NotificationChannel, payload: Any): NotificationOutcome {
        val body = sharedJsonMapper.writeValueAsString(payload)
        return try {
            // `toEntity(String::class.java)` em vez de `toBodilessEntity()`: o n8n sempre responde com um
            // corpo JSON, mesmo no ack imediato do webhook. Descartar sem ler (`toBodilessEntity`) faz o
            // backend JDK `HttpClient` do `RestClient` abortar a troca no meio, e a exceção some com uma
            // mensagem inútil ("Request cancelled") em vez do que realmente aconteceu na resposta.
            restClient.post()
                .uri(channel.url)
                .headers { headers ->
                    headers.contentType = MediaType.APPLICATION_JSON
                    val secretId = channel.authSecretId
                    val headerName = channel.authHeaderName
                    if (secretId != null && !headerName.isNullOrBlank()) {
                        val value = secretService.resolveValue(userId, secretId).value
                        headers.set(headerName, value)
                    }
                }
                .body(body)
                .retrieve()
                .toEntity(String::class.java)
            NotificationOutcome.Success
        } catch (exception: RestClientException) {
            val detail = describeFailure(exception)
            logger.warn("Falha ao notificar canal {}: {}", channel.id, detail, exception)
            NotificationOutcome.Failure(detail)
        }
    }

    /**
     * `ResourceAccessException.message` é literalmente `"I/O error on POST request for \"<uri>\": " +
     * cause.message` — quando a causa raiz (SSLHandshakeException, ConnectException, etc.) não tem
     * mensagem própria, o usuário via só um `": null"` sem nenhuma pista pra diagnosticar. Sobe a cadeia
     * de causas até achar uma mensagem não-vazia; na ausência de uma, usa o nome da classe da causa raiz
     * (ex.: "ConnectException") em vez de "null".
     */
    private fun describeFailure(exception: RestClientException): String {
        var cause: Throwable = exception
        while (cause.cause != null && cause.cause !== cause) cause = cause.cause!!
        return cause.message?.takeIf { it.isNotBlank() }
            ?: cause::class.simpleName
            ?: "Erro desconhecido ao enviar a notificação"
    }
}
