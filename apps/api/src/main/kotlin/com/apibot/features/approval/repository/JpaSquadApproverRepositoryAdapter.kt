package com.apibot.features.approval.repository

import com.apibot.features.approval.model.SquadApprover
import com.apibot.features.approval.model.toDomain
import com.apibot.features.approval.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaSquadApproverRepositoryAdapter(
    private val jpaRepository: JpaSquadApproverRepository,
) : SquadApproverRepository {
    override fun save(approver: SquadApprover): SquadApprover =
        jpaRepository.save(approver.toEntity()).toDomain()

    override fun findById(id: UUID): SquadApprover? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun findAllBySquadId(squadId: UUID): List<SquadApprover> =
        jpaRepository.findAllBySquadId(squadId).map { it.toDomain() }

    override fun findBySquadIdAndApproverUserId(squadId: UUID, approverUserId: UUID): SquadApprover? =
        jpaRepository.findBySquadIdAndApproverUserId(squadId, approverUserId)?.toDomain()

    override fun deleteById(id: UUID) = jpaRepository.deleteById(id)
}
