package com.apibot.features.agentpromptversion.repository

import com.apibot.features.agentpromptversion.model.AgentPromptVersion
import com.apibot.features.agentpromptversion.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaAgentPromptVersionRepositoryAdapter(
    private val jpaRepository: JpaAgentPromptVersionRepository,
) : AgentPromptVersionRepository {
    override fun save(version: AgentPromptVersion): AgentPromptVersion =
        jpaRepository.save(version.toEntity()).toDomain()

    override fun findById(id: UUID): AgentPromptVersion? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun findAllByAgentId(agentId: UUID): List<AgentPromptVersion> =
        jpaRepository.findAllByAgentIdOrderByVersionDesc(agentId).map { it.toDomain() }

    override fun countByAgentId(agentId: UUID): Long =
        jpaRepository.countByAgentId(agentId)

    override fun deleteAllByAgentId(agentId: UUID) =
        jpaRepository.deleteAllByAgentId(agentId)
}
