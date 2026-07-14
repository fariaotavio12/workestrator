package com.apibot.features.assistantsession.model

import com.apibot.features.assistantsession.dto.AssistantSessionResponse
import com.apibot.features.assistantsession.dto.AssistantSessionSummaryResponse
import java.time.Instant
import java.util.UUID

/** A single chat turn — mirrors the frontend `ConfigAssistantMessage` shape. */
data class Message(
    val id: String,
    val role: String,
    val content: String,
)

data class AssistantSession(
    val id: UUID = UUID.randomUUID(),
    val userId: UUID,
    val title: String,
    val providerId: String? = null,
    val model: String? = null,
    val workingDir: String? = null,
    val groupId: String? = null,
    val messages: List<Message> = emptyList(),
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now(),
)

fun AssistantSession.toResponse(): AssistantSessionResponse = AssistantSessionResponse(
    id = this.id,
    title = this.title,
    providerId = this.providerId,
    model = this.model,
    workingDir = this.workingDir,
    groupId = this.groupId,
    messages = this.messages,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)

fun AssistantSession.toSummaryResponse(): AssistantSessionSummaryResponse = AssistantSessionSummaryResponse(
    id = this.id,
    title = this.title,
    providerId = this.providerId,
    model = this.model,
    workingDir = this.workingDir,
    groupId = this.groupId,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
