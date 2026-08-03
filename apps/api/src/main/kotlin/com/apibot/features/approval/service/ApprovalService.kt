package com.apibot.features.approval.service

import com.apibot.features.agent.repository.AgentRepository
import com.apibot.features.approval.config.ApprovalProperties
import com.apibot.features.approval.domain.exception.ApprovalAccessDeniedException
import com.apibot.features.approval.domain.exception.ApprovalItemNotFoundException
import com.apibot.features.approval.domain.exception.ApprovalRequestNotFoundException
import com.apibot.features.approval.domain.exception.ItemizedApprovalRequiresPerItemDecisionException
import com.apibot.features.approval.domain.exception.RejectionRequiresFeedbackException
import com.apibot.features.approval.domain.exception.TooManyApprovalItemsException
import com.apibot.features.approval.dto.CreateApprovalRequest
import com.apibot.features.approval.model.ApprovalDecidedByRole
import com.apibot.features.approval.model.ApprovalItem
import com.apibot.features.approval.model.ApprovalItemStatus
import com.apibot.features.approval.model.ApprovalRequest
import com.apibot.features.approval.model.ApprovalStatus
import com.apibot.features.approval.repository.ApprovalRequestRepository
import com.apibot.features.approval.repository.NotificationChannelRepository
import com.apibot.features.approval.service.integration.ApprovalNotificationDispatcher
import com.apibot.features.user.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
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

        if (request.items.size > properties.itemsMaxCount) {
            throw TooManyApprovalItemsException(
                "This checkpoint carries ${request.items.size} items, above the limit of ${properties.itemsMaxCount}",
            )
        }

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
                items = request.items.map {
                    // `id` do cliente quando vem (correlação — ver `CreateApprovalItemRequest.id`); gerado
                    // aqui quando não vem, para nunca existir item sem identidade própria.
                    ApprovalItem(id = it.id ?: UUID.randomUUID(), ref = it.ref, label = it.label, data = it.data)
                },
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
        // Um veredito de lote num pedido com itens apagaria os vereditos individuais sem o usuário
        // perceber (design D15) — a granularidade existe, então usá-la deixa de ser opcional.
        if (approval.hasItems) {
            throw ItemizedApprovalRequiresPerItemDecisionException()
        }
        if (!approved && feedback.isNullOrBlank()) {
            throw RejectionRequiresFeedbackException()
        }

        val decided = repository.save(
            approval.copy(
                status = if (approved) ApprovalStatus.APPROVED else ApprovalStatus.REJECTED,
                decidedByUserId = userId,
                decidedByRole = roleOf(userId, approval),
                decidedAt = Instant.now(),
                feedback = feedback,
                updatedAt = Instant.now(),
            ),
        )
        return DecideOutcome.Applied(decided)
    }

    /**
     * Decide **um item** (design D15). "Primeira decisão vence" (D10) vale por item, não pelo pedido: dois
     * aprovadores podem trabalhar no mesmo lote em paralelo e só colidem se pegarem o mesmo item — por isso
     * `AlreadyDecided` aqui devolve o pedido com aquele item já resolvido, não um erro.
     *
     * Ao fechar o **último** item pendente, resolve o pedido pai por D16 (`approved` se algum item passou).
     *
     * `@Transactional` + `findByIdForUpdate` são o que **sustentam** essa promessa de paralelismo: a decisão
     * reescreve o array `items` inteiro, então sem o lock de linha dois itens decididos ao mesmo tempo se
     * sobrescreveriam e o pedido travaria em PENDING para sempre. É o único método transacional da feature —
     * os outros fazem um único `save` e abrir transação neles atrapalharia a visibilidade do dispatcher
     * assíncrono (ver `ApprovalNotificationDispatcher`), que aqui não entra em jogo.
     */
    @Transactional
    fun decideItem(userId: UUID, id: UUID, itemId: UUID, approved: Boolean, feedback: String?): DecideOutcome {
        val approval = repository.findByIdForUpdate(id) ?: throw ApprovalRequestNotFoundException()
        requireCanDecide(userId, approval)

        if (approval.status != ApprovalStatus.PENDING) {
            return DecideOutcome.AlreadyDecided(approval)
        }
        val item = approval.items.firstOrNull { it.id == itemId } ?: throw ApprovalItemNotFoundException()
        if (item.status != ApprovalItemStatus.PENDING) {
            return DecideOutcome.AlreadyDecided(approval)
        }
        if (!approved && feedback.isNullOrBlank()) {
            throw RejectionRequiresFeedbackException()
        }

        val now = Instant.now()
        val decidedItem = item.copy(
            status = if (approved) ApprovalItemStatus.APPROVED else ApprovalItemStatus.REJECTED,
            feedback = feedback,
            decidedByUserId = userId,
            decidedByRole = roleOf(userId, approval),
            decidedAt = now,
        )
        val withItem = approval.copy(
            items = approval.items.map { if (it.id == itemId) decidedItem else it },
            updatedAt = now,
        )

        // `statusFromItems` devolve null enquanto sobrar item pendente — aí o pedido segue PENDING e o run
        // continua pausado, que é exatamente o que a UI mostra como "3 de 20 decididos".
        val resolved = withItem.statusFromItems()
        val next = if (resolved == null) {
            withItem
        } else {
            withItem.copy(
                status = resolved,
                decidedByUserId = userId,
                decidedByRole = roleOf(userId, withItem),
                decidedAt = now,
                // Só no caso "todos reprovados": aí o `feedback` do pai é o motivo do pedido inteiro, e
                // deixá-lo nulo esconderia a justificativa de quem lê só o pedido. No caso misto (aprovado
                // com alguns itens reprovados) o motivo é *por item* — preencher aqui daria a impressão de
                // que o lote foi reprovado. Quem precisa dos motivos individuais lê `items[].feedback`.
                feedback = if (resolved == ApprovalStatus.REJECTED) aggregateFeedback(withItem.items) else null,
            )
        }
        return DecideOutcome.Applied(repository.save(next))
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

    /** Contra o snapshot (D8): estar na lista de aprovadores vence, mesmo se o usuário também é o dono. */
    private fun roleOf(userId: UUID, approval: ApprovalRequest): ApprovalDecidedByRole =
        if (approval.approverUserIds.contains(userId)) {
            ApprovalDecidedByRole.APPROVER
        } else {
            ApprovalDecidedByRole.OWNER
        }

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
     * Junta as justificativas dos itens reprovados num motivo único para o pedido. Truncado pelo mesmo teto
     * do `summary`: com o limite de itens em 200, concatenar justificativas livres daria um texto sem teto
     * numa coluna que a tela e o aviso exibem inteira.
     */
    private fun aggregateFeedback(items: List<ApprovalItem>): String? = items
        .filter { it.status == ApprovalItemStatus.REJECTED }
        .mapNotNull { item ->
            item.feedback?.takeIf { it.isNotBlank() }?.let { reason ->
                if (item.ref.isNullOrBlank()) reason else "${item.ref}: $reason"
            }
        }
        .joinToString(" | ")
        .takeIf { it.isNotBlank() }
        ?.let { truncateSummary(it) }

    /**
     * `squad`/`agent`/`run` carregam só o `id` — quem compõe o texto legível (`title`/`summary`) é o
     * runtime no navegador, que já tem nome de squad/agente em memória ao montar `CreateApprovalRequest`.
     * Nada aqui precisa de `SquadRepository`/nome de agente só para reconstruir o que já foi composto.
     * `approvers` é aditivo (não exige bump de `version`) — deixa o fluxo do n8n rotear por e-mail em vez
     * de ter um contato fixo, sem obrigar nenhuma mudança do lado dele. `items`/`itemCount` também são
     * aditivos (design D15): `data` sai **passthrough**, porque o esquema é do domínio de quem montou o
     * squad — quem sabe ler `NUM_PROCESS`/`EXECUTOR_RESPONSAVEL` é o fluxo do n8n, nunca este arquivo.
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
        "itemCount" to approval.items.size,
        "items" to approval.items.map { item ->
            mapOf(
                "id" to item.id,
                "ref" to item.ref,
                "label" to item.label,
                "status" to item.status,
                // Mesma tela, item em foco — permite uma mensagem por item no Teams (Split Out), cada uma
                // linkando o seu próprio item, sem rota nova nem token.
                "decisionUrl" to "${properties.decisionBaseUrl}/${approval.id}?item=${item.id}",
                "data" to item.data,
            )
        },
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
