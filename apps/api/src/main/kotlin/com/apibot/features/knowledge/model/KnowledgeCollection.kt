package com.apibot.features.knowledge.model

import com.apibot.features.knowledge.dto.KnowledgeCollectionResponse
import java.time.Instant
import java.util.UUID

/**
 * Base de conhecimento global do usuário — catálogo standalone (não aninhado em squad). Um agente
 * aponta para uma ou mais coleções via `Agent.knowledgeCollectionIds` no front; o run recupera trechos
 * relevantes só das coleções indicadas por aquele agente.
 */
data class KnowledgeCollection(
    val id: UUID = UUID.randomUUID(),
    val userId: UUID,
    val name: String,
    val description: String? = null,
    val documentCount: Int = 0,
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now(),
)

fun KnowledgeCollection.toResponse(): KnowledgeCollectionResponse = KnowledgeCollectionResponse(
    id = this.id,
    name = this.name,
    description = this.description,
    documentCount = this.documentCount,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
