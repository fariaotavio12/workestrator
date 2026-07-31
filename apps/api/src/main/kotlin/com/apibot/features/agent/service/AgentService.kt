package com.apibot.features.agent.service

import com.apibot.features.agent.domain.exception.AgentAccessDeniedException
import com.apibot.features.agent.domain.exception.AgentNotFoundException
import com.apibot.features.agent.dto.CreateAgentRequest
import com.apibot.features.agent.dto.UpdateAgentRequest
import com.apibot.features.agent.model.Agent
import com.apibot.features.agent.model.AgentApprovalPolicy
import com.apibot.features.agent.repository.AgentRepository
import com.apibot.features.agentpromptversion.model.AgentPromptVersion
import com.apibot.features.agentpromptversion.repository.AgentPromptVersionRepository
import com.apibot.features.approval.domain.exception.InvalidApprovalPolicyException
import com.apibot.features.approval.repository.SquadApproverRepository
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
    // Dependência direta nos *repositórios* (não nos serviços) de propósito, nos dois casos pelo mesmo
    // motivo: `SquadApproverService` já depende de `AgentService` (checagem de remoção, D13/001) e
    // `AgentPromptVersionService` também (reverter, D6/002) — depender dos serviços aqui criaria ciclos de
    // beans que o Spring não resolve. Mesmo padrão de `AgentService` já depender de `SeatRepository` direto.
    private val squadApproverRepository: SquadApproverRepository,
    private val promptVersionRepository: AgentPromptVersionRepository,
) {
    fun createAgent(userId: UUID, squadId: UUID, request: CreateAgentRequest): Agent {
        squadService.getSquadForUser(userId, squadId)
        validateApprovalPolicy(squadId, request.approvalPolicy)

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
            notifyPolicy = request.notifyPolicy,
            approvalPolicy = request.approvalPolicy,
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
        val approvalPolicy = request.approvalPolicy ?: current.approvalPolicy
        validateApprovalPolicy(squadId, approvalPolicy)
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
            notifyPolicy = request.notifyPolicy ?: current.notifyPolicy,
            approvalPolicy = approvalPolicy,
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
     * formulário (D6, .specs/002-treinamento-pos-reprovacao). Versionar só o que vem do treinamento
     * deixaria o histórico com buracos exatamente onde alguém mexeu na mão, que é o caso que motivou a
     * feature.
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

    /**
     * Invariante D13 (.specs/001-aprovacoes-externas-teams): `ownerCanDecide == false` exige pelo menos um
     * aprovador, e todo id em `approverUserIds` precisa pertencer ao pool do squad. Validado aqui — não só
     * na UI — porque é a única forma de garantir que nenhum agente fique com checkpoint que ninguém pode
     * decidir.
     */
    private fun validateApprovalPolicy(squadId: UUID, policy: AgentApprovalPolicy?) {
        if (policy == null) return

        if (!policy.ownerCanDecide && policy.approverUserIds.isEmpty()) {
            throw InvalidApprovalPolicyException(
                "Cannot disable owner decision without assigning at least one approver",
            )
        }

        if (policy.approverUserIds.isNotEmpty()) {
            val pool = squadApproverRepository.findAllBySquadId(squadId).map { it.approverUserId }.toSet()
            val outsidePool = policy.approverUserIds.filterNot { pool.contains(it) }
            if (outsidePool.isNotEmpty()) {
                throw InvalidApprovalPolicyException(
                    "One or more approvers are not in this squad's approver pool",
                )
            }
        }
    }
}
