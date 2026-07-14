package com.apibot.features.agent.repository

import com.apibot.features.agent.model.Agent
import java.util.UUID

interface AgentRepository {
    fun save(agent: Agent): Agent
    fun findById(id: UUID): Agent?
    fun findAllBySquadId(squadId: UUID): List<Agent>
    fun update(agent: Agent): Agent
    fun deleteById(id: UUID)
    fun deleteAllBySquadId(squadId: UUID)
}
