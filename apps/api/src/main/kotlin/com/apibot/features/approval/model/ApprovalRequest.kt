package com.apibot.features.approval.model

import com.apibot.features.approval.dto.ApprovalItemResponse
import com.apibot.features.approval.dto.ApprovalResponse
import com.apibot.shared.extensions.emptyJsonObject
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue
import com.fasterxml.jackson.databind.JsonNode
import java.time.Instant
import java.util.UUID

enum class ApprovalStatus(@JsonValue val value: String) {
    PENDING("pending"),
    APPROVED("approved"),
    REJECTED("rejected"),
    CANCELED("canceled"),
    ;

    companion object {
        @JsonCreator
        @JvmStatic
        fun fromValue(value: String): ApprovalStatus =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unknown approval status: $value")
    }
}

enum class CheckpointKind(@JsonValue val value: String) {
    BEFORE("before"),
    AFTER("after"),
    ;

    companion object {
        @JsonCreator
        @JvmStatic
        fun fromValue(value: String): CheckpointKind =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unknown checkpoint kind: $value")
    }
}

enum class ApprovalDecidedByRole(@JsonValue val value: String) {
    OWNER("owner"),
    APPROVER("approver"),
    ;

    companion object {
        @JsonCreator
        @JvmStatic
        fun fromValue(value: String): ApprovalDecidedByRole =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unknown decided-by role: $value")
    }
}

/**
 * Deliberadamente separado de `ApprovalStatus`: um item nunca é `CANCELED` (cancelar é do pedido inteiro,
 * D12). Ao contrário dos outros enums da feature, este vive dentro de um `jsonb` e **não** gera `*_check` no
 * Postgres — crescer aqui não exige o drop/recreate que os enums de coluna exigem.
 */
enum class ApprovalItemStatus(@JsonValue val value: String) {
    PENDING("pending"),
    APPROVED("approved"),
    REJECTED("rejected"),
    ;

    companion object {
        @JsonCreator
        @JvmStatic
        fun fromValue(value: String): ApprovalItemStatus =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unknown approval item status: $value")
    }
}

/**
 * Um item decidível dentro de um pedido (design D15) — quando o passo anterior produziu uma lista e aprovar
 * o lote inteiro num botão só perderia *quais* itens passaram.
 *
 * `data` é **passthrough**: o esquema pertence ao domínio de quem montou o squad (chamado de T.I., post,
 * pedido…) e o backend nunca o interpreta. `ref`/`label` chegam prontos do runtime, que os extrai por
 * heurística genérica — cravar nome de campo aqui amarraria o produto a um caso de uso específico.
 */
data class ApprovalItem(
    val id: UUID = UUID.randomUUID(),
    val ref: String? = null,
    val label: String? = null,
    val data: JsonNode = emptyJsonObject(),
    val status: ApprovalItemStatus = ApprovalItemStatus.PENDING,
    val feedback: String? = null,
    val decidedByUserId: UUID? = null,
    val decidedByRole: ApprovalDecidedByRole? = null,
    val decidedAt: Instant? = null,
)

/**
 * Pedido de aprovação de um checkpoint (ver .specs/001-aprovacoes-externas-teams). `approverUserIds` e
 * `ownerCanDecide` são um **snapshot** (design D8) da política do agente no momento da criação — quem
 * podia decidir quando o checkpoint abriu continua podendo decidir este pedido específico, mesmo que a
 * política do agente mude depois. `canDecide`/`canCancel` são a única porta de autorização (design,
 * "A regra de autorização, num só lugar") — nunca reimplementar a checagem fora daqui.
 */
data class ApprovalRequest(
    val id: UUID = UUID.randomUUID(),
    val ownerUserId: UUID,
    val squadId: UUID,
    val runId: UUID,
    val seatId: String,
    val agentId: UUID? = null,
    val checkpointKind: CheckpointKind,
    val status: ApprovalStatus = ApprovalStatus.PENDING,
    val title: String,
    val summary: String,
    val channelId: UUID? = null,
    val notifiedAt: Instant? = null,
    val notifyError: String? = null,
    val approverUserIds: List<UUID> = emptyList(),
    val ownerCanDecide: Boolean = true,
    val decidedByUserId: UUID? = null,
    val decidedByRole: ApprovalDecidedByRole? = null,
    val decidedAt: Instant? = null,
    val feedback: String? = null,
    val items: List<ApprovalItem> = emptyList(),
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now(),
) {
    /**
     * Quem pode decidir (aprovar/reprovar) — sempre contra o snapshot, nunca a política ao vivo (D8).
     */
    fun canDecide(requesterId: UUID): Boolean =
        approverUserIds.contains(requesterId) || (requesterId == ownerUserId && ownerCanDecide)

    /** Pedido com granularidade por item (D15) — decidir o lote inteiro deixa de ser permitido. */
    val hasItems: Boolean get() = items.isNotEmpty()

    /**
     * Status que o pedido assume quando o **último** item pendente é decidido (design D16) — `null`
     * enquanto ainda há item pendente, ou quando o pedido não tem itens. `APPROVED` se **algum** item foi
     * aprovado: reprovar 2 de 20 não pode abortar o run inteiro, que era justamente o caso de uso.
     */
    fun statusFromItems(): ApprovalStatus? {
        if (items.isEmpty() || items.any { it.status == ApprovalItemStatus.PENDING }) return null
        return if (items.any { it.status == ApprovalItemStatus.APPROVED }) {
            ApprovalStatus.APPROVED
        } else {
            ApprovalStatus.REJECTED
        }
    }

    /**
     * Quem pode CANCELAR — só o dono, **mesmo que `ownerCanDecide == false`** (design D12): retirar-se da
     * decisão não retira o direito de abortar a própria execução.
     */
    fun canCancel(requesterId: UUID): Boolean = requesterId == ownerUserId

    /**
     * Quem pode VER o pedido — dono sempre (ele precisa enxergar pra poder cancelar, mesmo sem poder
     * decidir) ou qualquer aprovador do snapshot. Deliberadamente mais permissivo que `canDecide`: um
     * dono com `ownerCanDecide == false` não é "sem acesso", é "sem poder de decisão" — a tela de
     * decisão usa `canDecide`/`canCancel` (expostos em `ApprovalResponse`) para diferenciar os dois.
     */
    fun canView(requesterId: UUID): Boolean = requesterId == ownerUserId || approverUserIds.contains(requesterId)
}

fun ApprovalRequest.toResponse(requesterId: UUID): ApprovalResponse = ApprovalResponse(
    id = this.id,
    squadId = this.squadId,
    runId = this.runId,
    seatId = this.seatId,
    agentId = this.agentId,
    checkpointKind = this.checkpointKind,
    status = this.status,
    title = this.title,
    summary = this.summary,
    channelId = this.channelId,
    notifiedAt = this.notifiedAt,
    notifyError = this.notifyError,
    decidedByUserId = this.decidedByUserId,
    decidedByRole = this.decidedByRole,
    decidedAt = this.decidedAt,
    feedback = this.feedback,
    canDecide = this.status == ApprovalStatus.PENDING && this.canDecide(requesterId),
    canCancel = this.status == ApprovalStatus.PENDING && this.canCancel(requesterId),
    items = this.items.map { it.toResponse() },
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)

/**
 * Sem `canDecide` por item: a autorização é do pedido (mesmo snapshot para todos os itens) — a tela combina
 * o `canDecide` do pedido com `status == pending` do item para saber o que ainda é decidível.
 */
fun ApprovalItem.toResponse(): ApprovalItemResponse = ApprovalItemResponse(
    id = this.id,
    ref = this.ref,
    label = this.label,
    data = this.data,
    status = this.status,
    feedback = this.feedback,
    decidedByUserId = this.decidedByUserId,
    decidedByRole = this.decidedByRole,
    decidedAt = this.decidedAt,
)
