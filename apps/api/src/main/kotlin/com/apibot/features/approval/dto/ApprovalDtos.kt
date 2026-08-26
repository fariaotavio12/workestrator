package com.apibot.features.approval.dto

import com.apibot.features.approval.model.ApprovalDecidedByRole
import com.apibot.features.approval.model.ApprovalItemStatus
import com.apibot.features.approval.model.ApprovalStatus
import com.apibot.features.approval.model.CheckpointKind
import com.apibot.features.run.model.RunStatus
import com.apibot.shared.extensions.emptyJsonObject
import com.fasterxml.jackson.databind.JsonNode
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.Instant
import java.util.UUID

@Schema(description = "Request to create an approval request for a pending checkpoint")
data class CreateApprovalRequest(
    @field:NotNull(message = "Squad ID is required")
    @Schema(description = "Squad ID") val squadId: UUID,

    @field:NotNull(message = "Run ID is required")
    @Schema(description = "Run ID") val runId: UUID,

    @field:NotBlank(message = "Seat ID is required")
    @Schema(description = "Seat ID of the pending agent") val seatId: String,

    @Schema(description = "Agent ID, if resolved") val agentId: UUID? = null,

    @field:NotNull(message = "Checkpoint kind is required")
    @Schema(description = "Whether the pause is before or after the agent acts") val checkpointKind: CheckpointKind,

    @field:NotBlank(message = "Title is required")
    @Schema(description = "Card title") val title: String,

    @field:NotBlank(message = "Summary is required")
    @Schema(description = "Card summary — truncated server-side, never a full artifact") val summary: String,

    @field:Valid
    @Schema(description = "Decidable items, when the checkpoint reviews a list — empty for a plain approve/reject")
    val items: List<CreateApprovalItemRequest> = emptyList(),
)

@Schema(description = "A single decidable item of an approval request")
data class CreateApprovalItemRequest(
    /**
     * Aceito do cliente de propósito: o runtime cria os itens ao abrir o checkpoint e precisa correlacionar
     * os seus com os do servidor. Sem isso a única correlação seria a ordem da lista, que quebra silencioso
     * na primeira vez que alguém reordenar ou filtrar. Ausente ⇒ o servidor gera.
     */
    @Schema(description = "Client-generated item ID, so the runtime can correlate its local items")
    val id: UUID? = null,

    @Schema(description = "Human-facing business key, extracted client-side (e.g. a ticket number)")
    val ref: String? = null,

    @Schema(description = "Short label for the item row") val label: String? = null,

    @Schema(description = "The raw item as produced by the agent — passthrough, never interpreted server-side")
    val data: JsonNode = emptyJsonObject(),
)

@Schema(description = "Request to decide a pending approval")
data class DecideApprovalRequest(
    @Schema(description = "Whether the checkpoint is approved") val approved: Boolean,
    @Schema(description = "Rejection justification — required when approved = false") val feedback: String? = null,
)

@Schema(description = "Approval request response")
data class ApprovalResponse(
    @Schema(description = "Approval ID") val id: UUID,
    @Schema(description = "Squad ID") val squadId: UUID,
    @Schema(description = "Run ID") val runId: UUID,
    @Schema(description = "Seat ID") val seatId: String,
    @Schema(description = "Agent ID, if resolved") val agentId: UUID?,
    @Schema(description = "Whether the pause is before or after the agent acts") val checkpointKind: CheckpointKind,
    @Schema(description = "Current status") val status: ApprovalStatus,
    @Schema(description = "Card title") val title: String,
    @Schema(description = "Card summary") val summary: String,
    @Schema(description = "Notification channel used, if any") val channelId: UUID?,
    @Schema(description = "When the notification was sent, if any") val notifiedAt: Instant?,
    @Schema(description = "Notification delivery error, if any") val notifyError: String?,
    @Schema(description = "Who decided, if decided") val decidedByUserId: UUID?,
    @Schema(description = "Whether the decider was the owner or a pool approver") val decidedByRole: ApprovalDecidedByRole?,
    @Schema(description = "When it was decided, if decided") val decidedAt: Instant?,
    @Schema(description = "Rejection justification, if rejected") val feedback: String?,
    @Schema(description = "Whether the authenticated requester can approve/reject this request right now")
    val canDecide: Boolean,
    @Schema(description = "Whether the authenticated requester can cancel this request (owner only, even without canDecide)")
    val canCancel: Boolean,
    @Schema(description = "Decidable items — empty for a plain approve/reject request")
    val items: List<ApprovalItemResponse>,
    @Schema(description = "Creation date") val createdAt: Instant,
    @Schema(description = "Last update date") val updatedAt: Instant,
)

@Schema(description = "A single decidable item of an approval request")
data class ApprovalItemResponse(
    @Schema(description = "Item ID") val id: UUID,
    @Schema(description = "Human-facing business key") val ref: String?,
    @Schema(description = "Short label for the item row") val label: String?,
    @Schema(description = "The raw item as produced by the agent — passthrough") val data: JsonNode,
    @Schema(description = "Current item status") val status: ApprovalItemStatus,
    @Schema(description = "Rejection justification, if rejected") val feedback: String?,
    @Schema(description = "Who decided this item, if decided") val decidedByUserId: UUID?,
    @Schema(description = "Whether the decider was the owner or a pool approver") val decidedByRole: ApprovalDecidedByRole?,
    @Schema(description = "When this item was decided, if decided") val decidedAt: Instant?,
)

/**
 * Vista da execução liberada a quem participa de um pedido de aprovação (design D5-bis). Não é o
 * `RunResponse`: é um recorte deliberado do run, com só o que dá para ler um transcript.
 *
 * Fora daqui, de propósito: `authBindingsSnapshot` (quais conexões o dono escolheu), `rejections`
 * (insumo de treinamento do dono — ver .specs/002) e `resumedFromRunId` (linhagem de runs que o
 * aprovador não pode abrir de qualquer forma). Nada aqui torna o squad alcançável — continua não
 * existindo endpoint que aceite `squadId` de quem não é dono.
 */
@Schema(description = "Read-only view of the run behind an approval request")
data class ApprovalRunResponse(
    @Schema(description = "Run ID") val id: UUID,
    @Schema(description = "Approval request this view was authorized by") val approvalId: UUID,
    @Schema(description = "Input given to the orchestrator") val input: String,
    @Schema(description = "Run status") val status: RunStatus,
    @Schema(description = "When the run started") val startedAt: Instant,
    @Schema(description = "When the run ended, if it has") val endedAt: Instant?,
    @Schema(description = "Steps executed and their artifacts") val steps: JsonNode,
    @Schema(description = "Questions asked and answers given during the run") val qaLog: JsonNode,
    @Schema(description = "Snapshot of pending checkpoint/question state — tells where the run is right now")
    val runtimeSnapshot: JsonNode?,
    @Schema(description = "Files generated/changed during the run — metadata only, no content") val files: JsonNode,
    @Schema(description = "The squad, reduced to what labels a transcript") val squad: ApprovalRunSquadResponse?,
    @Schema(description = "The cast of the run, reduced to what labels a turn") val agents: List<ApprovalRunAgentResponse>,
)

@Schema(description = "Squad identity shown alongside an approval's run — never its prompts or settings")
data class ApprovalRunSquadResponse(
    @Schema(description = "Squad ID") val id: UUID,
    @Schema(description = "Squad name") val name: String,
    @Schema(description = "Squad icon") val icon: String,
)

/** Só o que rotula um turno do transcript — sem prompt, modelo, ferramentas ou política de aprovação. */
@Schema(description = "Agent identity shown alongside an approval's run")
data class ApprovalRunAgentResponse(
    @Schema(description = "Agent ID") val id: UUID,
    @Schema(description = "Agent name") val name: String,
    @Schema(description = "Agent role") val role: String,
    @Schema(description = "Avatar character") val character: String,
    @Schema(description = "Avatar accent color") val accentColor: String,
)
