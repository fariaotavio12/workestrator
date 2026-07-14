package com.apibot.features.assistantsessiongroup.service

import com.apibot.features.assistantsession.repository.AssistantSessionRepository
import com.apibot.features.assistantsessiongroup.domain.exception.AssistantSessionGroupAccessDeniedException
import com.apibot.features.assistantsessiongroup.domain.exception.AssistantSessionGroupNotFoundException
import com.apibot.features.assistantsessiongroup.dto.CreateAssistantSessionGroupRequest
import com.apibot.features.assistantsessiongroup.dto.UpdateAssistantSessionGroupRequest
import com.apibot.features.assistantsessiongroup.model.AssistantSessionGroup
import com.apibot.features.assistantsessiongroup.repository.AssistantSessionGroupRepository
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

@Service
class AssistantSessionGroupService(
    private val groupRepository: AssistantSessionGroupRepository,
    private val sessionRepository: AssistantSessionRepository,
) {
    fun createGroup(userId: UUID, request: CreateAssistantSessionGroupRequest): AssistantSessionGroup {
        val group = AssistantSessionGroup(userId = userId, name = request.name, sortOrder = request.sortOrder)
        return groupRepository.save(group)
    }

    fun listGroups(userId: UUID): List<AssistantSessionGroup> =
        groupRepository.findAllByUserId(userId)

    fun getGroupForUser(userId: UUID, id: UUID): AssistantSessionGroup {
        val group = groupRepository.findById(id) ?: throw AssistantSessionGroupNotFoundException()
        if (group.userId != userId) throw AssistantSessionGroupAccessDeniedException()
        return group
    }

    fun updateGroup(userId: UUID, id: UUID, request: UpdateAssistantSessionGroupRequest): AssistantSessionGroup {
        val current = getGroupForUser(userId, id)
        val updated = current.copy(
            name = request.name ?: current.name,
            sortOrder = request.sortOrder ?: current.sortOrder,
            updatedAt = Instant.now(),
        )
        return groupRepository.update(updated)
    }

    fun deleteGroup(userId: UUID, id: UUID) {
        getGroupForUser(userId, id)
        // Desassocia as sessões do grupo removido (viram "sem grupo") antes de apagar o grupo.
        sessionRepository.findAllByUserId(userId)
            .filter { it.groupId == id.toString() }
            .forEach { sessionRepository.update(it.copy(groupId = null, updatedAt = Instant.now())) }
        groupRepository.deleteById(id)
    }
}
