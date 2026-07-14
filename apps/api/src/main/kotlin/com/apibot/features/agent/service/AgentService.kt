package com.apibot.features.agent.service

import com.apibot.features.agent.domain.exception.AgentAccessDeniedException
import com.apibot.features.agent.domain.exception.AgentNotFoundException
import com.apibot.features.agent.dto.CreateAgentRequest
import com.apibot.features.agent.dto.UpdateAgentRequest
import com.apibot.features.agent.model.Agent
import com.apibot.features.agent.repository.AgentRepository
import com.apibot.features.seat.repository.SeatRepository
import com.apibot.features.squad.service.SquadService
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

@Service
class AgentService(
    private val agentRepository: AgentRepository,
    private val seatRepository: SeatRepository,
    private val squadService: SquadService,
) {
    fun createAgent(userId: UUID, squadId: UUID, request: CreateAgentRequest): Agent {
        squadService.getSquadForUser(userId, squadId)

        val agent = Agent(
            squadId = squadId,
            userId = userId,
            name = request.name,
            role = request.role,
            systemPrompt = request.systemPrompt,
            providerId = request.providerId,
            model = request.model,
            scriptIds = request.scriptIds,
            knowledgeCollectionIds = request.knowledgeCollectionIds,
            canExecute = request.canExecute,
            requiresCheckpoint = request.requiresCheckpoint,
            requiresCheckpointAfter = request.requiresCheckpointAfter,
            character = request.character,
            gender = request.gender,
            accentColor = request.accentColor,
        )
        return agentRepository.save(agent)
    }

    fun listAgents(userId: UUID, squadId: UUID): List<Agent> {
        squadService.getSquadForUser(userId, squadId)
        return agentRepository.findAllBySquadId(squadId)
    }

    fun getAgentForUser(userId: UUID, squadId: UUID, id: UUID): Agent {
        val agent = agentRepository.findById(id) ?: throw AgentNotFoundException()
        if (agent.squadId != squadId) throw AgentNotFoundException()
        if (agent.userId != userId) throw AgentAccessDeniedException()
        return agent
    }

    fun updateAgent(userId: UUID, squadId: UUID, id: UUID, request: UpdateAgentRequest): Agent {
        val current = getAgentForUser(userId, squadId, id)
        val updated = current.copy(
            name = request.name ?: current.name,
            role = request.role ?: current.role,
            systemPrompt = request.systemPrompt ?: current.systemPrompt,
            providerId = request.providerId ?: current.providerId,
            model = request.model ?: current.model,
            scriptIds = request.scriptIds ?: current.scriptIds,
            knowledgeCollectionIds = request.knowledgeCollectionIds ?: current.knowledgeCollectionIds,
            canExecute = request.canExecute ?: current.canExecute,
            requiresCheckpoint = request.requiresCheckpoint ?: current.requiresCheckpoint,
            requiresCheckpointAfter = request.requiresCheckpointAfter ?: current.requiresCheckpointAfter,
            character = request.character ?: current.character,
            gender = request.gender ?: current.gender,
            accentColor = request.accentColor ?: current.accentColor,
            updatedAt = Instant.now(),
        )
        return agentRepository.update(updated)
    }

    fun deleteAgent(userId: UUID, squadId: UUID, id: UUID) {
        getAgentForUser(userId, squadId, id)
        seatRepository.findAllBySquadId(squadId)
            .filter { it.agentId == id }
            .forEach { seatRepository.update(it.copy(agentId = null)) }
        agentRepository.deleteById(id)
    }
}
