package com.apibot.features.agentpromptversion.repository

import com.apibot.features.agentpromptversion.model.AgentPromptVersionEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaAgentPromptVersionRepository : JpaRepository<AgentPromptVersionEntity, UUID> {
    fun findAllByAgentIdOrderByVersionDesc(agentId: UUID): List<AgentPromptVersionEntity>
    fun countByAgentId(agentId: UUID): Long
    fun deleteAllByAgentId(agentId: UUID)
}
