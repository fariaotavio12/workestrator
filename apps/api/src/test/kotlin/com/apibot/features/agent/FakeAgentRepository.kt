package com.apibot.features.agent

import com.apibot.features.agent.model.Agent
import com.apibot.features.agent.repository.AgentRepository
import java.util.UUID

class FakeAgentRepository : AgentRepository {
    val stored = mutableMapOf<UUID, Agent>()

    override fun save(agent: Agent): Agent {
        stored[agent.id] = agent
        return agent
    }

    override fun findById(id: UUID): Agent? = stored[id]

    override fun findAllBySquadId(squadId: UUID): List<Agent> =
        stored.values.filter { it.squadId == squadId }

    override fun update(agent: Agent): Agent {
        stored[agent.id] = agent
        return agent
    }

    override fun deleteById(id: UUID) {
        stored.remove(id)
    }

    override fun deleteAllBySquadId(squadId: UUID) {
        stored.values.removeIf { it.squadId == squadId }
    }
}
