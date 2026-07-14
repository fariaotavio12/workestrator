package com.apibot.features.knowledge.repository

import com.apibot.features.knowledge.model.KnowledgeDocument
import java.util.UUID

interface KnowledgeDocumentRepository {
    fun save(document: KnowledgeDocument): KnowledgeDocument
    fun findById(id: UUID): KnowledgeDocument?
    fun findAllByCollectionId(collectionId: UUID): List<KnowledgeDocument>
    fun countByCollectionId(collectionId: UUID): Int
    fun update(document: KnowledgeDocument): KnowledgeDocument
    fun deleteById(id: UUID)
    fun deleteAllByCollectionId(collectionId: UUID)
}
