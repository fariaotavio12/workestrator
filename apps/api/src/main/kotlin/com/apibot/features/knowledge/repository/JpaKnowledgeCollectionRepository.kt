package com.apibot.features.knowledge.repository

import com.apibot.features.knowledge.model.KnowledgeCollectionEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaKnowledgeCollectionRepository : JpaRepository<KnowledgeCollectionEntity, UUID> {
    fun findAllByUserIdOrderByCreatedAtDesc(userId: UUID): List<KnowledgeCollectionEntity>
}
