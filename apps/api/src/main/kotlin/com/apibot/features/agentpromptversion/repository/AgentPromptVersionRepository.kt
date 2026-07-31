package com.apibot.features.agentpromptversion.repository

import com.apibot.features.agentpromptversion.model.AgentPromptVersion
import java.util.UUID

interface AgentPromptVersionRepository {
    fun save(version: AgentPromptVersion): AgentPromptVersion
    fun findById(id: UUID): AgentPromptVersion?
    fun findAllByAgentId(agentId: UUID): List<AgentPromptVersion>
    fun countByAgentId(agentId: UUID): Long
    fun deleteAllByAgentId(agentId: UUID)
}
