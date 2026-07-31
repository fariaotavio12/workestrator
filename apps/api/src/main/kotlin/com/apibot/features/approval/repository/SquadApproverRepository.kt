package com.apibot.features.approval.repository

import com.apibot.features.approval.model.SquadApprover
import java.util.UUID

interface SquadApproverRepository {
    fun save(approver: SquadApprover): SquadApprover
    fun findById(id: UUID): SquadApprover?
    fun findAllBySquadId(squadId: UUID): List<SquadApprover>
    fun findBySquadIdAndApproverUserId(squadId: UUID, approverUserId: UUID): SquadApprover?
    fun deleteById(id: UUID)
}
