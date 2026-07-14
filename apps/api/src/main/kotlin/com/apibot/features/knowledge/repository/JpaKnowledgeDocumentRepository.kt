package com.apibot.features.knowledge.repository

import com.apibot.features.knowledge.model.KnowledgeDocumentEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaKnowledgeDocumentRepository : JpaRepository<KnowledgeDocumentEntity, UUID> {
    fun findAllByCollectionIdOrderByCreatedAtDesc(collectionId: UUID): List<KnowledgeDocumentEntity>
    fun countByCollectionId(collectionId: UUID): Long
    fun deleteAllByCollectionId(collectionId: UUID)
}
