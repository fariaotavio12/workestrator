package com.apibot.features.assistantsessiongroup.model

import com.apibot.features.assistantsessiongroup.dto.AssistantSessionGroupResponse
import java.time.Instant
import java.util.UUID

data class AssistantSessionGroup(
    val id: UUID = UUID.randomUUID(),
    val userId: UUID,
    val name: String,
    val sortOrder: Int = 0,
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now(),
)

fun AssistantSessionGroup.toResponse(): AssistantSessionGroupResponse = AssistantSessionGroupResponse(
    id = this.id,
    name = this.name,
    sortOrder = this.sortOrder,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
