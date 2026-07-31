package com.apibot.features.agentpromptversion

import com.apibot.features.agentpromptversion.model.AgentPromptVersion
import com.apibot.features.agentpromptversion.repository.AgentPromptVersionRepository
import java.util.UUID

class FakeAgentPromptVersionRepository : AgentPromptVersionRepository {
    val stored = mutableMapOf<UUID, AgentPromptVersion>()

    override fun save(version: AgentPromptVersion): AgentPromptVersion {
        stored[version.id] = version
        return version
    }

    override fun findById(id: UUID): AgentPromptVersion? = stored[id]

    override fun findAllByAgentId(agentId: UUID): List<AgentPromptVersion> =
        stored.values.filter { it.agentId == agentId }.sortedByDescending { it.version }

    override fun countByAgentId(agentId: UUID): Long =
        stored.values.count { it.agentId == agentId }.toLong()

    override fun deleteAllByAgentId(agentId: UUID) {
        stored.values.removeIf { it.agentId == agentId }
    }
}
