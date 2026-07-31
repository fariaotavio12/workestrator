package com.apibot.features.agent.service

import com.apibot.features.agent.domain.exception.AgentAccessDeniedException
import com.apibot.features.agent.domain.exception.AgentNotFoundException
import com.apibot.features.agent.dto.CreateAgentRequest
import com.apibot.features.agent.dto.UpdateAgentRequest
import com.apibot.features.agent.model.Agent
import com.apibot.features.agent.repository.AgentRepository
import com.apibot.features.agentpromptversion.model.AgentPromptVersion
import com.apibot.features.agentpromptversion.repository.AgentPromptVersionRepository
import com.apibot.features.seat.repository.SeatRepository
import com.apibot.features.squad.service.SquadService
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

// Depende do repositório de versões, não do `AgentPromptVersionService` — este último depende deste
// serviço para reverter, e injetar os dois um no outro seria referência circular de bean.
@Service
class AgentService(
    private val agentRepository: AgentRepository,
    private val seatRepository: SeatRepository,
    private val squadService: SquadService,
    private val promptVersionRepository: AgentPromptVersionRepository,
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
            authBindings = request.authBindings,
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
        recordPromptVersionIfChanged(current, request)
        val updated = current.copy(
            name = request.name ?: current.name,
            role = request.role ?: current.role,
            systemPrompt = request.systemPrompt ?: current.systemPrompt,
            providerId = request.providerId ?: current.providerId,
            model = request.model ?: current.model,
            scriptIds = request.scriptIds ?: current.scriptIds,
            knowledgeCollectionIds = request.knowledgeCollectionIds ?: current.knowledgeCollectionIds,
            authBindings = request.authBindings ?: current.authBindings,
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
        promptVersionRepository.deleteAllByAgentId(id)
        agentRepository.deleteById(id)
    }

    /**
     * Guarda o texto **anterior** sempre que o `systemPrompt` muda — inclusive numa edição manual pelo
     * formulário. Versionar só o que vem do treinamento deixaria o histórico com buracos exatamente
     * onde alguém mexeu na mão, que é o caso que motivou a feature.
     */
    private fun recordPromptVersionIfChanged(current: Agent, request: UpdateAgentRequest) {
        val next = request.systemPrompt ?: return
        if (next == current.systemPrompt) return

        promptVersionRepository.save(
            AgentPromptVersion(
                userId = current.userId,
                squadId = current.squadId,
                agentId = current.id,
                version = (promptVersionRepository.countByAgentId(current.id) + 1).toInt(),
                systemPrompt = current.systemPrompt,
                reason = request.promptChangeReason,
                sourceRunId = request.sourceRunId,
                sourceRejectionId = request.sourceRejectionId,
            )
        )
    }
}
