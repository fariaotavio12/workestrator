package com.apibot.features.approval.dto

import com.apibot.features.approval.model.ApprovalDecidedByRole
import com.apibot.features.approval.model.ApprovalItemStatus
import com.apibot.features.approval.model.ApprovalStatus
import com.apibot.features.approval.model.CheckpointKind
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
