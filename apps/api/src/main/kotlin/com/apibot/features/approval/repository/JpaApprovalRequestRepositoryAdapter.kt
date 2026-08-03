package com.apibot.features.approval.repository

import com.apibot.features.approval.model.ApprovalRequest
import com.apibot.features.approval.model.ApprovalStatus
import com.apibot.features.approval.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaApprovalRequestRepositoryAdapter(
    private val jpaRepository: JpaApprovalRequestRepository,
) : ApprovalRequestRepository {
    override fun save(request: ApprovalRequest): ApprovalRequest =
        jpaRepository.save(request.toEntity()).toDomain()

    override fun findById(id: UUID): ApprovalRequest? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun findByIdForUpdate(id: UUID): ApprovalRequest? =
        jpaRepository.findByIdForUpdate(id)?.toDomain()

    override fun findAllByRunId(runId: UUID): List<ApprovalRequest> =
        jpaRepository.findAllByRunId(runId).map { it.toDomain() }

    override fun findAllAssignedTo(userId: UUID, status: ApprovalStatus?): List<ApprovalRequest> =
        jpaRepository.findAllByApproverUserIdInSnapshot(userId.toString())
            .map { it.toDomain() }
            .filter { status == null || it.status == status }
}
