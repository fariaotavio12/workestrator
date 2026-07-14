package com.apibot.features.assistantsession.repository

import com.apibot.features.assistantsession.model.AssistantSessionEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaAssistantSessionRepository : JpaRepository<AssistantSessionEntity, UUID> {
    fun findAllByUserIdOrderByUpdatedAtDesc(userId: UUID): List<AssistantSessionEntity>
}
