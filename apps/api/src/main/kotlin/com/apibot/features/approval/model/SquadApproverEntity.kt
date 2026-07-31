package com.apibot.features.approval.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "squad_approvers",
    uniqueConstraints = [UniqueConstraint(columnNames = ["squad_id", "approver_user_id"])],
)
class SquadApproverEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(name = "squad_id", nullable = false)
    var squadId: UUID,

    @Column(name = "owner_user_id", nullable = false)
    var ownerUserId: UUID,

    @Column(name = "approver_user_id", nullable = false)
    var approverUserId: UUID,

    @Column(name = "invited_at", nullable = false, updatable = false)
    var invitedAt: Instant = Instant.now(),
) {
    fun toDomain(): SquadApprover = SquadApprover(
        id = this.id,
        squadId = this.squadId,
        ownerUserId = this.ownerUserId,
        approverUserId = this.approverUserId,
        invitedAt = this.invitedAt,
    )
}

fun SquadApprover.toEntity(): SquadApproverEntity = SquadApproverEntity(
    id = this.id,
    squadId = this.squadId,
    ownerUserId = this.ownerUserId,
    approverUserId = this.approverUserId,
    invitedAt = this.invitedAt,
)
