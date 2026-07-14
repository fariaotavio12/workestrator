package com.apibot.features.assistantsession.repository

import com.apibot.features.assistantsession.model.AssistantSession
import com.apibot.features.assistantsession.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaAssistantSessionRepositoryAdapter(
    private val jpaRepository: JpaAssistantSessionRepository,
) : AssistantSessionRepository {
    override fun save(session: AssistantSession): AssistantSession =
        jpaRepository.save(session.toEntity()).toDomain()

    override fun findById(id: UUID): AssistantSession? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun findAllByUserId(userId: UUID): List<AssistantSession> =
        jpaRepository.findAllByUserIdOrderByUpdatedAtDesc(userId).map { it.toDomain() }

    override fun update(session: AssistantSession): AssistantSession =
        jpaRepository.save(session.toEntity()).toDomain()

    override fun deleteById(id: UUID) =
        jpaRepository.deleteById(id)
}
