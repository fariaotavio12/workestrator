package com.apibot.features.approval.repository

import com.apibot.features.approval.model.SquadApproverEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaSquadApproverRepository : JpaRepository<SquadApproverEntity, UUID> {
    fun findAllBySquadId(squadId: UUID): List<SquadApproverEntity>
    fun findBySquadIdAndApproverUserId(squadId: UUID, approverUserId: UUID): SquadApproverEntity?
}
