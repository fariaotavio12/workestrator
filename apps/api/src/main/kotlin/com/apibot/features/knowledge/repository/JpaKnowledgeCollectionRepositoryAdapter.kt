package com.apibot.features.knowledge.repository

import com.apibot.features.knowledge.model.KnowledgeCollection
import com.apibot.features.knowledge.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaKnowledgeCollectionRepositoryAdapter(
    private val jpaRepository: JpaKnowledgeCollectionRepository,
) : KnowledgeCollectionRepository {
    override fun save(collection: KnowledgeCollection): KnowledgeCollection =
        jpaRepository.save(collection.toEntity()).toDomain()

    override fun findById(id: UUID): KnowledgeCollection? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun findAllByUserId(userId: UUID): List<KnowledgeCollection> =
        jpaRepository.findAllByUserIdOrderByCreatedAtDesc(userId).map { it.toDomain() }

    override fun update(collection: KnowledgeCollection): KnowledgeCollection =
        jpaRepository.save(collection.toEntity()).toDomain()

    override fun deleteById(id: UUID) =
        jpaRepository.deleteById(id)
}
