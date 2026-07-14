package com.apibot.features.knowledge.repository

import com.apibot.features.knowledge.model.KnowledgeDocument
import com.apibot.features.knowledge.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Repository
@Primary
class JpaKnowledgeDocumentRepositoryAdapter(
    private val jpaRepository: JpaKnowledgeDocumentRepository,
) : KnowledgeDocumentRepository {
    override fun save(document: KnowledgeDocument): KnowledgeDocument =
        jpaRepository.save(document.toEntity()).toDomain()

    override fun findById(id: UUID): KnowledgeDocument? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun findAllByCollectionId(collectionId: UUID): List<KnowledgeDocument> =
        jpaRepository.findAllByCollectionIdOrderByCreatedAtDesc(collectionId).map { it.toDomain() }

    override fun countByCollectionId(collectionId: UUID): Int =
        jpaRepository.countByCollectionId(collectionId).toInt()

    override fun update(document: KnowledgeDocument): KnowledgeDocument =
        jpaRepository.save(document.toEntity()).toDomain()

    override fun deleteById(id: UUID) =
        jpaRepository.deleteById(id)

    @Transactional
    override fun deleteAllByCollectionId(collectionId: UUID) =
        jpaRepository.deleteAllByCollectionId(collectionId)
}
