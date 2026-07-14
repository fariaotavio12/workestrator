package com.apibot.features.agent.repository

import com.apibot.features.agent.model.AgentEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaAgentRepository : JpaRepository<AgentEntity, UUID> {
    fun findAllBySquadId(squadId: UUID): List<AgentEntity>
    fun deleteAllBySquadId(squadId: UUID)
}
