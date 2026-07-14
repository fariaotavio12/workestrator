package com.apibot.features.knowledge.repository

import com.apibot.features.knowledge.model.KnowledgeCollection
import java.util.UUID

interface KnowledgeCollectionRepository {
    fun save(collection: KnowledgeCollection): KnowledgeCollection
    fun findById(id: UUID): KnowledgeCollection?
    fun findAllByUserId(userId: UUID): List<KnowledgeCollection>
    fun update(collection: KnowledgeCollection): KnowledgeCollection
    fun deleteById(id: UUID)
}
