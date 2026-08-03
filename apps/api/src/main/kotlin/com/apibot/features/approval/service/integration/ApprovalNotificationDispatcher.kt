package com.apibot.features.approval.service.integration

import com.apibot.features.approval.model.NotificationChannel
import com.apibot.features.approval.repository.ApprovalRequestRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/**
 * Fora de `ApprovalService` de propósito: `@Async` só é interceptado pelo proxy do Spring em chamada
 * **entre beans diferentes** — chamar um método `@Async` da própria classe (`this.metodo()`) roda
 * síncrono e silenciosamente ignora a anotação. Mesmo padrão de `IngestionService.ingestAsync`, chamado
 * de `KnowledgeService` (bean diferente). Sem isso, `ApprovalService.create` bloquearia a requisição do
 * checkpoint pelos até ~8s de timeout do `WebhookNotifier` — exatamente o NFR "nunca bloqueia o run".
 */
@Component
class ApprovalNotificationDispatcher(
    private val webhookNotifier: WebhookNotifier,
    private val approvalRequestRepository: ApprovalRequestRepository,
) {
    private val logger = LoggerFactory.getLogger(ApprovalNotificationDispatcher::class.java)

    /**
     * `@Transactional` junto com `@Async` (proxies diferentes, ambos honrados porque a chamada vem de outro
     * bean): o stamp de `notifiedAt`/`notifyError` é um read-modify-write da linha inteira, então sem o lock
     * ele pode sobrescrever um veredito de item gravado no meio do caminho (design D15). A janela é curta —
     * o re-read acontece depois do webhook responder — mas é a mesma classe de perda de decisão que
     * `ApprovalService.decideItem` fecha, e o custo de fechar aqui também é uma linha.
     */
    @Async
    @Transactional
    fun dispatch(userId: UUID, approvalId: UUID, channel: NotificationChannel, payload: Any) {
        val outcome = webhookNotifier.send(userId, channel, payload)
        val current = approvalRequestRepository.findByIdForUpdate(approvalId) ?: return

        val updated = when (outcome) {
            is NotificationOutcome.Success -> current.copy(
                channelId = channel.id,
                notifiedAt = Instant.now(),
                notifyError = null,
                updatedAt = Instant.now(),
            )

            is NotificationOutcome.Failure -> current.copy(
                channelId = channel.id,
                notifyError = outcome.message,
                updatedAt = Instant.now(),
            )
        }
        approvalRequestRepository.save(updated)

        if (outcome is NotificationOutcome.Failure) {
            logger.warn("Aviso do checkpoint {} falhou: {}", approvalId, outcome.message)
        }
    }
}
