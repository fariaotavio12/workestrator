package com.apibot.features.agent.repository

import com.apibot.features.agent.model.Agent
import com.apibot.features.agent.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaAgentRepositoryAdapter(
    private val jpaRepository: JpaAgentRepository,
) : AgentRepository {
    override fun save(agent: Agent): Agent =
        jpaRepository.save(agent.toEntity()).toDomain()

    override fun findById(id: UUID): Agent? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun findAllBySquadId(squadId: UUID): List<Agent> =
        jpaRepository.findAllBySquadId(squadId).map { it.toDomain() }

    override fun update(agent: Agent): Agent =
        jpaRepository.save(agent.toEntity()).toDomain()

    override fun deleteById(id: UUID) =
        jpaRepository.deleteById(id)

    override fun deleteAllBySquadId(squadId: UUID) =
        jpaRepository.deleteAllBySquadId(squadId)
}
