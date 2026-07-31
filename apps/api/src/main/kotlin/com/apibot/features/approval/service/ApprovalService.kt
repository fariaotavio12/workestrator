package com.apibot.features.approval.service

import com.apibot.features.agent.repository.AgentRepository
import com.apibot.features.approval.config.ApprovalProperties
import com.apibot.features.approval.domain.exception.ApprovalAccessDeniedException
import com.apibot.features.approval.domain.exception.ApprovalRequestNotFoundException
import com.apibot.features.approval.domain.exception.RejectionRequiresFeedbackException
import com.apibot.features.approval.dto.CreateApprovalRequest
import com.apibot.features.approval.model.ApprovalDecidedByRole
import com.apibot.features.approval.model.ApprovalRequest
import com.apibot.features.approval.model.ApprovalStatus
import com.apibot.features.approval.repository.ApprovalRequestRepository
import com.apibot.features.approval.repository.NotificationChannelRepository
import com.apibot.features.approval.service.integration.ApprovalNotificationDispatcher
import com.apibot.features.user.repository.UserRepository
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

/**
 * Resultado de `ApprovalService.decide` — "primeira decisão vence" (design D10) modelado como retorno, não
 * como exceção: já foi decidido não é um erro do chamador, é um estado legítimo que o controller traduz
 * para 409 **com o corpo da decisão original** (não um `ApiErrorResponse` genérico), porque o fluxo do n8n
 * e a tela de decisão dependem de saber quem decidiu primeiro.
 */
sealed class DecideOutcome {
    data class Applied(val request: ApprovalRequest) : DecideOutcome()
    data class AlreadyDecided(val request: ApprovalRequest) : DecideOutcome()
}

@Service
class ApprovalService(
    private val repository: ApprovalRequestRepository,
    // Cross-feature direto no repositório (não em `AgentService`), mesmo padrão já usado em
    // `AgentService` → `SeatRepository`: aqui é só leitura da política para o snapshot (D8), sem
    // reimplementar nenhuma regra de negócio do agente.
    private val agentRepository: AgentRepository,
    private val notificationChannelRepository: NotificationChannelRepository,
    private val notificationDispatcher: ApprovalNotificationDispatcher,
    private val userRepository: UserRepository,
    private val properties: ApprovalProperties,
) {
    /**
     * Registra o pedido e, se a política do agente tiver aviso ligado, dispara o envio. A política de
     * autorização (`approverUserIds`/`ownerCanDecide`) é resolvida **aqui, no servidor**, a partir do
     * agente atual — nunca aceita do corpo da requisição, para um cliente não poder fabricar quem decide.
     * Falha no envio do aviso não falha a criação do pedido (NFR "nunca bloqueia o run").
     */
    fun create(userId: UUID, request: CreateApprovalRequest): ApprovalRequest {
        val agent = request.agentId
            ?.let { agentRepository.findById(it) }
            ?.takeIf { it.userId == userId }
        val approvalPolicy = agent?.approvalPolicy
        val notifyPolicy = agent?.notifyPolicy

        val approval = repository.save(
            ApprovalRequest(
                ownerUserId = userId,
                squadId = request.squadId,
                runId = request.runId,
                seatId = request.seatId,
                agentId = request.agentId,
                checkpointKind = request.checkpointKind,
                title = request.title,
                summary = truncateSummary(request.summary),
                approverUserIds = approvalPolicy?.approverUserIds ?: emptyList(),
                ownerCanDecide = approvalPolicy?.ownerCanDecide ?: true,
            ),
        )

        // Disparo assíncrono (`ApprovalNotificationDispatcher.dispatch` é `@Async`) — esta chamada retorna
        // na hora; `notifiedAt`/`notifyError` são gravados depois, quando o envio terminar.
        val channelId = notifyPolicy?.channelId
        if (notifyPolicy?.enabled == true && channelId != null) {
            val channel = notificationChannelRepository.findById(channelId)?.takeIf { it.userId == userId }
            if (channel != null) {
                notificationDispatcher.dispatch(userId, approval.id, channel, buildNotificationPayload(approval))
            }
        }

        return approval
    }

    /**
     * Ver o pedido é mais permissivo que decidir (`canView`, não `canDecide`) — o dono precisa enxergar
     * mesmo com `ownerCanDecide == false`, porque ele ainda pode cancelar (D12). A tela de decisão usa
     * `ApprovalResponse.canDecide`/`canCancel` (calculados por requester) para saber o que mostrar.
     */
    fun get(userId: UUID, id: UUID): ApprovalRequest {
        val approval = findOrThrow(id)
        if (!approval.canView(userId)) throw ApprovalAccessDeniedException()
        return approval
    }

    fun listByRun(userId: UUID, runId: UUID): List<ApprovalRequest> =
        repository.findAllByRunId(runId).filter { it.ownerUserId == userId }

    /** RF13 — aprovações onde o usuário está no snapshot, independente do dono. */
    fun assignedToMe(userId: UUID, status: ApprovalStatus?): List<ApprovalRequest> =
        repository.findAllAssignedTo(userId, status)

    fun decide(userId: UUID, id: UUID, approved: Boolean, feedback: String?): DecideOutcome {
        val approval = findOrThrow(id)
        requireCanDecide(userId, approval)

        if (approval.status != ApprovalStatus.PENDING) {
            return DecideOutcome.AlreadyDecided(approval)
        }
        if (!approved && feedback.isNullOrBlank()) {
            throw RejectionRequiresFeedbackException()
        }

        val role = if (approval.approverUserIds.contains(userId)) {
            ApprovalDecidedByRole.APPROVER
        } else {
            ApprovalDecidedByRole.OWNER
        }

        val decided = repository.save(
            approval.copy(
                status = if (approved) ApprovalStatus.APPROVED else ApprovalStatus.REJECTED,
                decidedByUserId = userId,
                decidedByRole = role,
                decidedAt = Instant.now(),
                feedback = feedback,
                updatedAt = Instant.now(),
            ),
        )
        return DecideOutcome.Applied(decided)
    }

    /**
     * Reenvia o aviso de um pedido ainda pendente (RF10 — botão "reenviar" no painel do dono, quando a
     * primeira tentativa falhou). Owner-only: é uma ação de gestão do run, não uma decisão. Assíncrono,
     * como em `create` — devolve o pedido como está; `notifyError` atualiza quando o envio terminar.
     */
    fun renotify(userId: UUID, id: UUID): ApprovalRequest {
        val approval = findOrThrow(id)
        if (approval.ownerUserId != userId) throw ApprovalAccessDeniedException()
        if (approval.status != ApprovalStatus.PENDING) return approval

        val channelId = approval.channelId
            ?: approval.agentId?.let { agentRepository.findById(it)?.notifyPolicy?.channelId }
        val channel = channelId?.let { notificationChannelRepository.findById(it) }?.takeIf { it.userId == userId }
            ?: return approval

        notificationDispatcher.dispatch(userId, approval.id, channel, buildNotificationPayload(approval))
        return approval
    }

    /** O dono sempre pode cancelar, mesmo com `ownerCanDecide = false` — cancelar não é decidir (design D12). */
    fun cancel(userId: UUID, id: UUID): ApprovalRequest {
        val approval = findOrThrow(id)
        if (!approval.canCancel(userId)) throw ApprovalAccessDeniedException()
        if (approval.status != ApprovalStatus.PENDING) return approval

        return repository.save(
            approval.copy(
                status = ApprovalStatus.CANCELED,
                decidedByUserId = userId,
                decidedByRole = ApprovalDecidedByRole.OWNER,
                decidedAt = Instant.now(),
                updatedAt = Instant.now(),
            ),
        )
    }

    private fun findOrThrow(id: UUID): ApprovalRequest =
        repository.findById(id) ?: throw ApprovalRequestNotFoundException()

    private fun requireCanDecide(userId: UUID, approval: ApprovalRequest) {
        if (approval.canDecide(userId)) return
        if (userId == approval.ownerUserId && !approval.ownerCanDecide) {
            throw ApprovalAccessDeniedException(
                "You have opted out of deciding this agent's checkpoints — " +
                    "ask an assigned approver, or cancel the run instead",
            )
        }
        throw ApprovalAccessDeniedException()
    }

    private fun truncateSummary(text: String): String =
        if (text.length <= properties.summaryMaxChars) text else text.take(properties.summaryMaxChars - 1) + "…"

    /**
     * `squad`/`agent`/`run` carregam só o `id` — quem compõe o texto legível (`title`/`summary`) é o
     * runtime no navegador, que já tem nome de squad/agente em memória ao montar `CreateApprovalRequest`.
     * Nada aqui precisa de `SquadRepository`/nome de agente só para reconstruir o que já foi composto.
     * `approvers` é aditivo (não exige bump de `version`) — deixa o fluxo do n8n rotear por e-mail em vez
     * de ter um contato fixo, sem obrigar nenhuma mudança do lado dele.
     */
    private fun buildNotificationPayload(approval: ApprovalRequest): Map<String, Any?> = mapOf(
        "version" to 1,
        "event" to "checkpoint.opened",
        "approvalId" to approval.id,
        "squad" to mapOf("id" to approval.squadId),
        "run" to mapOf("id" to approval.runId),
        "agent" to mapOf("id" to approval.agentId),
        "checkpointKind" to approval.checkpointKind,
        "title" to approval.title,
        "summary" to approval.summary,
        "decisionUrl" to "${properties.decisionBaseUrl}/${approval.id}",
        "approvers" to resolveApprovers(approval.approverUserIds),
        "createdAt" to approval.createdAt.toString(),
    )

    private fun resolveApprovers(approverUserIds: List<UUID>): List<Map<String, String>> {
        if (approverUserIds.isEmpty()) return emptyList()
        return userRepository.findAllById(approverUserIds).map {
            mapOf("email" to it.email, "displayName" to it.name)
        }
    }
}
