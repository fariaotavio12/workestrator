package com.apibot.features.squad.repository

import com.apibot.features.squad.model.Squad
import com.apibot.features.squad.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaSquadRepositoryAdapter(
    private val jpaRepository: JpaSquadRepository,
) : SquadRepository {
    override fun save(squad: Squad): Squad =
        jpaRepository.save(squad.toEntity()).toDomain()

    override fun findById(id: UUID): Squad? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun findAllByUserId(userId: UUID): List<Squad> =
        jpaRepository.findAllByUserId(userId).map { it.toDomain() }

    override fun update(squad: Squad): Squad =
        jpaRepository.save(squad.toEntity()).toDomain()

    override fun deleteById(id: UUID) =
        jpaRepository.deleteById(id)
}
