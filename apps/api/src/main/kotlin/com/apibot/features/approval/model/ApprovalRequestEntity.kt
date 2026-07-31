package com.apibot.features.approval.model

import com.apibot.shared.extensions.emptyJsonArray
import com.apibot.shared.extensions.toJsonNode
import com.apibot.shared.extensions.toObject
import com.fasterxml.jackson.databind.JsonNode
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "approval_requests")
class ApprovalRequestEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var ownerUserId: UUID,

    @Column(nullable = false)
    var squadId: UUID,

    @Column(nullable = false)
    var runId: UUID,

    @Column(nullable = false)
    var seatId: String = "",

    @Column(nullable = true)
    var agentId: UUID? = null,

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    var checkpointKind: CheckpointKind = CheckpointKind.BEFORE,

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    var status: ApprovalStatus = ApprovalStatus.PENDING,

    @Column(nullable = false, columnDefinition = "text")
    var title: String = "",

    @Column(nullable = false, columnDefinition = "text")
    var summary: String = "",

    @Column(nullable = true)
    var channelId: UUID? = null,

    @Column(nullable = true)
    var notifiedAt: Instant? = null,

    @Column(nullable = true, columnDefinition = "text")
    var notifyError: String? = null,

    // Snapshot (design D8) da política do agente no momento da criação — ver `ApprovalRequest`.
    @Column(nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var approverUserIds: JsonNode = emptyJsonArray(),

    @Column(nullable = false, columnDefinition = "boolean default true")
    var ownerCanDecide: Boolean = true,

    @Column(nullable = true)
    var decidedByUserId: UUID? = null,

    @Column(nullable = true)
    @Enumerated(EnumType.STRING)
    var decidedByRole: ApprovalDecidedByRole? = null,

    @Column(nullable = true)
    var decidedAt: Instant? = null,

    @Column(nullable = true, columnDefinition = "text")
    var feedback: String? = null,

    @Column(nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    @Column(nullable = false)
    var updatedAt: Instant = Instant.now(),
) {
    @PrePersist
    fun prePersist() {
        val now = Instant.now()
        createdAt = now
        updatedAt = now
    }

    @PreUpdate
    fun preUpdate() {
        updatedAt = Instant.now()
    }

    fun toDomain(): ApprovalRequest = ApprovalRequest(
        id = this.id,
        ownerUserId = this.ownerUserId,
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
        approverUserIds = this.approverUserIds.toObject(),
        ownerCanDecide = this.ownerCanDecide,
        decidedByUserId = this.decidedByUserId,
        decidedByRole = this.decidedByRole,
        decidedAt = this.decidedAt,
        feedback = this.feedback,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt,
    )
}

fun ApprovalRequest.toEntity(): ApprovalRequestEntity = ApprovalRequestEntity(
    id = this.id,
    ownerUserId = this.ownerUserId,
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
    approverUserIds = this.approverUserIds.toJsonNode(),
    ownerCanDecide = this.ownerCanDecide,
    decidedByUserId = this.decidedByUserId,
    decidedByRole = this.decidedByRole,
    decidedAt = this.decidedAt,
    feedback = this.feedback,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
