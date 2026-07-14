package com.apibot.features.assistantsessiongroup.repository

import com.apibot.features.assistantsessiongroup.model.AssistantSessionGroupEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaAssistantSessionGroupRepository : JpaRepository<AssistantSessionGroupEntity, UUID> {
    fun findAllByUserIdOrderBySortOrderAscCreatedAtAsc(userId: UUID): List<AssistantSessionGroupEntity>
}
