package com.apibot.features.agentpromptversion.service

import com.apibot.features.agent.dto.UpdateAgentRequest
import com.apibot.features.agent.service.AgentService
import com.apibot.features.agentpromptversion.domain.exception.AgentPromptVersionNotFoundException
import com.apibot.features.agentpromptversion.model.AgentPromptVersion
import com.apibot.features.agentpromptversion.repository.AgentPromptVersionRepository
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class AgentPromptVersionService(
    private val agentService: AgentService,
    private val promptVersionRepository: AgentPromptVersionRepository,
) {
    fun list(userId: UUID, squadId: UUID, agentId: UUID): List<AgentPromptVersion> {
        agentService.getAgentForUser(userId, squadId, agentId)
        return promptVersionRepository.findAllByAgentId(agentId)
    }

    /**
     * Restaura o texto de uma versão. A reversão passa por `updateAgent`, então ela mesma vira uma
     * versão nova — voltar atrás é auditável como qualquer outra alteração, e sempre reversível.
     */
    fun revert(userId: UUID, squadId: UUID, agentId: UUID, versionId: UUID): AgentPromptVersion {
        agentService.getAgentForUser(userId, squadId, agentId)
        val version = promptVersionRepository.findById(versionId) ?: throw AgentPromptVersionNotFoundException()
        // Escopo por dono e por agente: uma versão de outro usuário simplesmente não existe daqui.
        if (version.userId != userId || version.agentId != agentId) throw AgentPromptVersionNotFoundException()

        agentService.updateAgent(
            userId,
            squadId,
            agentId,
            UpdateAgentRequest(
                systemPrompt = version.systemPrompt,
                promptChangeReason = "Revertido para a versão ${version.version}.",
                sourceRunId = version.sourceRunId,
                sourceRejectionId = version.sourceRejectionId,
            ),
        )
        return version
    }
}
