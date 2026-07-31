package com.apibot.features.approval.service

import com.apibot.features.approval.domain.exception.NotificationChannelAccessDeniedException
import com.apibot.features.approval.domain.exception.NotificationChannelNotFoundException
import com.apibot.features.approval.dto.CreateNotificationChannelRequest
import com.apibot.features.approval.dto.NotificationChannelTestResponse
import com.apibot.features.approval.dto.UpdateNotificationChannelRequest
import com.apibot.features.approval.model.NotificationChannel
import com.apibot.features.approval.model.NotificationChannelStatus
import com.apibot.features.approval.repository.NotificationChannelRepository
import com.apibot.features.approval.service.integration.NotificationOutcome
import com.apibot.features.approval.service.integration.WebhookNotifier
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

@Service
class NotificationChannelService(
    private val repository: NotificationChannelRepository,
    private val webhookNotifier: WebhookNotifier,
) {
    fun create(userId: UUID, request: CreateNotificationChannelRequest): NotificationChannel {
        val channel = NotificationChannel(
            userId = userId,
            label = request.label,
            url = request.url,
            authSecretId = request.authSecretId,
            authHeaderName = request.authHeaderName,
        )
        return repository.save(channel)
    }

    fun list(userId: UUID): List<NotificationChannel> = repository.findAllByUserId(userId)

    fun getForUser(userId: UUID, id: UUID): NotificationChannel {
        val channel = repository.findById(id) ?: throw NotificationChannelNotFoundException()
        if (channel.userId != userId) throw NotificationChannelAccessDeniedException()
        return channel
    }

    fun update(userId: UUID, id: UUID, request: UpdateNotificationChannelRequest): NotificationChannel {
        val current = getForUser(userId, id)
        val updated = current.copy(
            label = request.label ?: current.label,
            url = request.url ?: current.url,
            authSecretId = request.authSecretId ?: current.authSecretId,
            authHeaderName = request.authHeaderName ?: current.authHeaderName,
            status = request.status ?: current.status,
            updatedAt = Instant.now(),
        )
        return repository.save(updated)
    }

    fun delete(userId: UUID, id: UUID) {
        getForUser(userId, id)
        repository.deleteById(id)
    }

    /**
     * Envia um aviso de exemplo (RF6 da spec) e reflete o resultado no próprio canal. O payload aqui
     * espelha exatamente `ApprovalService.buildNotificationPayload` — um teste com formato diferente do
     * que a produção manda validaria o fluxo do n8n contra um contrato que nunca chega de verdade.
     */
    fun test(userId: UUID, id: UUID): NotificationChannelTestResponse {
        val channel = getForUser(userId, id)
        val samplePayload = mapOf(
            "version" to 1,
            "event" to "checkpoint.opened",
            "approvalId" to null,
            "squad" to mapOf("id" to null),
            "run" to mapOf("id" to null),
            "agent" to mapOf("id" to null),
            "checkpointKind" to "before",
            "title" to "Teste de conexão — Workestrator",
            "summary" to "Este é um aviso de teste disparado a partir da configuração do canal.",
            "decisionUrl" to "https://example.invalid/dashboard/aprovacoes/teste",
            "approvers" to emptyList<Any>(),
            "createdAt" to Instant.now().toString(),
        )

        return when (val outcome = webhookNotifier.send(userId, channel, samplePayload)) {
            is NotificationOutcome.Success -> {
                repository.save(
                    channel.copy(
                        status = NotificationChannelStatus.ACTIVE,
                        lastTestedAt = Instant.now(),
                        lastError = null,
                        updatedAt = Instant.now(),
                    ),
                )
                NotificationChannelTestResponse(success = true)
            }

            is NotificationOutcome.Failure -> {
                repository.save(
                    channel.copy(
                        status = NotificationChannelStatus.ERROR,
                        lastTestedAt = Instant.now(),
                        lastError = outcome.message,
                        updatedAt = Instant.now(),
                    ),
                )
                NotificationChannelTestResponse(success = false, error = outcome.message)
            }
        }
    }
}
