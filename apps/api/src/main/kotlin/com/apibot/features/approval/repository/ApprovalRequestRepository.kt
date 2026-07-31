package com.apibot.features.approval.repository

import com.apibot.features.approval.model.ApprovalRequest
import com.apibot.features.approval.model.ApprovalStatus
import java.util.UUID

interface ApprovalRequestRepository {
    fun save(request: ApprovalRequest): ApprovalRequest
    fun findById(id: UUID): ApprovalRequest?
    fun findAllByRunId(runId: UUID): List<ApprovalRequest>

    /** Aprovações onde `userId` está no snapshot de `approverUserIds` — RF13/"assigned-to-me". */
    fun findAllAssignedTo(userId: UUID, status: ApprovalStatus?): List<ApprovalRequest>
}
