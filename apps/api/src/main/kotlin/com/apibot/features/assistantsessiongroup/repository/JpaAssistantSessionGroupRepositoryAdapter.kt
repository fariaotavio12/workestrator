package com.apibot.features.assistantsessiongroup.repository

import com.apibot.features.assistantsessiongroup.model.AssistantSessionGroup
import com.apibot.features.assistantsessiongroup.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaAssistantSessionGroupRepositoryAdapter(
    private val jpaRepository: JpaAssistantSessionGroupRepository,
) : AssistantSessionGroupRepository {
    override fun save(group: AssistantSessionGroup): AssistantSessionGroup =
        jpaRepository.save(group.toEntity()).toDomain()

    override fun findById(id: UUID): AssistantSessionGroup? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun findAllByUserId(userId: UUID): List<AssistantSessionGroup> =
        jpaRepository.findAllByUserIdOrderBySortOrderAscCreatedAtAsc(userId).map { it.toDomain() }

    override fun update(group: AssistantSessionGroup): AssistantSessionGroup =
        jpaRepository.save(group.toEntity()).toDomain()

    override fun deleteById(id: UUID) =
        jpaRepository.deleteById(id)
}
