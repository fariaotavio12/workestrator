package com.apibot.features.assistantsession.repository

import com.apibot.features.assistantsession.model.AssistantSession
import java.util.UUID

interface AssistantSessionRepository {
    fun save(session: AssistantSession): AssistantSession
    fun findById(id: UUID): AssistantSession?
    fun findAllByUserId(userId: UUID): List<AssistantSession>
    fun update(session: AssistantSession): AssistantSession
    fun deleteById(id: UUID)
}
