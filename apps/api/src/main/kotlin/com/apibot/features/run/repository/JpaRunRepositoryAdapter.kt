package com.apibot.features.run.repository

import com.apibot.features.run.model.Run
import com.apibot.features.run.model.toEntity
import com.apibot.shared.extensions.PageRequestParams
import com.apibot.shared.extensions.PageResult
import com.apibot.shared.extensions.toPageResult
import org.springframework.context.annotation.Primary
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaRunRepositoryAdapter(
    private val jpaRepository: JpaRunRepository,
) : RunRepository {
    override fun save(run: Run): Run =
        jpaRepository.save(run.toEntity()).toDomain()

    override fun findById(id: UUID): Run? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun findAllBySquadId(squadId: UUID): List<Run> =
        jpaRepository.findAllBySquadId(squadId).map { it.toDomain() }

    override fun findAllByUserId(userId: UUID, params: PageRequestParams): PageResult<Run> {
        val pageable = PageRequest.of(params.page, params.size, Sort.by(Sort.Direction.DESC, "startedAt"))
        return jpaRepository.findAllByUserId(userId, pageable).toPageResult { it.toDomain() }
    }

    override fun deleteAllBySquadId(squadId: UUID) =
        jpaRepository.deleteAllBySquadId(squadId)
}
