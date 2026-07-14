package com.apibot.features.assistantsessiongroup.repository

import com.apibot.features.assistantsessiongroup.model.AssistantSessionGroup
import java.util.UUID

interface AssistantSessionGroupRepository {
    fun save(group: AssistantSessionGroup): AssistantSessionGroup
    fun findById(id: UUID): AssistantSessionGroup?
    fun findAllByUserId(userId: UUID): List<AssistantSessionGroup>
    fun update(group: AssistantSessionGroup): AssistantSessionGroup
    fun deleteById(id: UUID)
}
