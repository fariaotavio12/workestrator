package com.apibot.features.approval.service.integration

import com.apibot.features.approval.config.ApprovalProperties
import com.apibot.features.approval.model.NotificationChannel
import com.apibot.features.secret.service.SecretService
import com.apibot.shared.extensions.sharedJsonMapper
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException
import java.net.http.HttpClient
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

    /**
     * `HTTP_1_1` **explícito**, e não o default do JDK (`HTTP_2`): num alvo `http://` (cleartext) o JDK
     * `HttpClient` em HTTP/2 tenta o upgrade h2c (`Upgrade: h2c` + `HTTP2-Settings`), e o n8n roda em
     * Node/Express, que não negocia h2c. A troca morria na hora (~24ms, rápido demais pra ser timeout)
     * como `ClosedChannelException`/`IOException: Request cancelled`, enquanto curl e Postman — que falam
     * HTTP/1.1 — passavam sem reclamar contra o mesmo endpoint.
     *
     * Também troca `ClientHttpRequestFactoryBuilder.detect()` por uma fábrica fixa: `detect()` escolhe o
     * cliente conforme o que está no classpath (Apache HC5 → Jetty → Reactor → JDK), então adicionar uma
     * dependência HTTP em qualquer outro ponto do projeto trocaria silenciosamente o transporte daqui e o
     * comportamento de protocolo junto.
     */
    private val restClient: RestClient = run {
        val httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(properties.notifyConnectTimeoutSeconds))
            .build()
        val requestFactory = JdkClientHttpRequestFactory(httpClient)
        requestFactory.setReadTimeout(Duration.ofSeconds(properties.notifyReadTimeoutSeconds))
        RestClient.builder().requestFactory(requestFactory).build()
    }

    fun send(userId: UUID, channel: NotificationChannel, payload: Any): NotificationOutcome {
        val body = sharedJsonMapper.writeValueAsString(payload)
        return try {
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
     * cause.message` — quando a causa raiz não tem mensagem própria, sobrava só um `": null"` sem pista
     * nenhuma. Desce até a causa raiz e sempre prefixa o tipo dela (`ConnectException: Connection
     * refused`, `IOException: Request cancelled`): a mensagem sozinha costuma não dizer em que camada a
     * coisa quebrou, e é isso que fica salvo em `lastError` e aparece na tela.
     */
    private fun describeFailure(exception: RestClientException): String {
        var cause: Throwable = exception
        while (cause.cause != null && cause.cause !== cause) cause = cause.cause!!
        val type = cause::class.simpleName ?: "Erro"
        val message = cause.message?.takeIf { it.isNotBlank() } ?: return type
        return "$type: $message"
    }
}
