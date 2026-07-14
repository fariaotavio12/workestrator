package com.apibot.features.assistantsession.service

import com.apibot.features.assistantsession.domain.exception.AssistantSessionAccessDeniedException
import com.apibot.features.assistantsession.domain.exception.AssistantSessionNotFoundException
import com.apibot.features.assistantsession.dto.CreateAssistantSessionRequest
import com.apibot.features.assistantsession.dto.UpdateAssistantSessionRequest
import com.apibot.features.assistantsession.model.AssistantSession
import com.apibot.features.assistantsession.repository.AssistantSessionRepository
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

@Service
class AssistantSessionService(
    private val assistantSessionRepository: AssistantSessionRepository,
) {
    fun createSession(userId: UUID, request: CreateAssistantSessionRequest): AssistantSession {
        val session = AssistantSession(
            userId = userId,
            title = request.title,
            providerId = request.providerId,
            model = request.model,
            workingDir = request.workingDir,
            groupId = request.groupId,
            messages = request.messages,
        )
        return assistantSessionRepository.save(session)
    }

    fun listSessions(userId: UUID): List<AssistantSession> =
        assistantSessionRepository.findAllByUserId(userId)

    fun getSessionForUser(userId: UUID, id: UUID): AssistantSession {
        val session = assistantSessionRepository.findById(id) ?: throw AssistantSessionNotFoundException()
        if (session.userId != userId) throw AssistantSessionAccessDeniedException()
        return session
    }

    fun updateSession(userId: UUID, id: UUID, request: UpdateAssistantSessionRequest): AssistantSession {
        val current = getSessionForUser(userId, id)
        val updated = current.copy(
            title = request.title ?: current.title,
            providerId = request.providerId ?: current.providerId,
            model = request.model ?: current.model,
            // Substituição direta (não patch): o assistente envia o snapshot completo da sessão a cada
            // rodada, então `workingDir` nulo significa "diretório removido", não "manter o atual".
            workingDir = request.workingDir,
            messages = request.messages ?: current.messages,
            updatedAt = Instant.now(),
        )
        return assistantSessionRepository.update(updated)
    }

    /** Move a sessão para um grupo (ou remove com `null`) — substituição direta, separada do update do chat. */
    fun setGroup(userId: UUID, id: UUID, groupId: String?): AssistantSession {
        val current = getSessionForUser(userId, id)
        return assistantSessionRepository.update(current.copy(groupId = groupId, updatedAt = Instant.now()))
    }

    fun deleteSession(userId: UUID, id: UUID) {
        getSessionForUser(userId, id)
        assistantSessionRepository.deleteById(id)
    }
}
