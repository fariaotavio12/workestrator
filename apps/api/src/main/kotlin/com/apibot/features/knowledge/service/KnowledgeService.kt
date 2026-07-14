package com.apibot.features.knowledge.service

import com.apibot.features.knowledge.domain.exception.CollectionAccessDeniedException
import com.apibot.features.knowledge.domain.exception.CollectionNotFoundException
import com.apibot.features.knowledge.domain.exception.DocumentNotFoundException
import com.apibot.features.knowledge.dto.CreateCollectionRequest
import com.apibot.features.knowledge.dto.UpdateCollectionRequest
import com.apibot.features.knowledge.model.KnowledgeCollection
import com.apibot.features.knowledge.model.KnowledgeDocument
import com.apibot.features.knowledge.dto.MultiSearchRequest
import com.apibot.features.knowledge.dto.SearchRequest
import com.apibot.features.knowledge.embedding.EmbeddingService
import com.apibot.features.knowledge.model.ChunkSearchResult
import com.apibot.features.knowledge.model.DocumentStatus
import com.apibot.features.knowledge.repository.KnowledgeChunkRepository
import com.apibot.features.knowledge.repository.KnowledgeCollectionRepository
import com.apibot.features.knowledge.repository.KnowledgeDocumentRepository
import com.apibot.shared.exceptions.BusinessRuleViolationException
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import java.time.Instant
import java.util.UUID

@Service
class KnowledgeService(
    private val collectionRepository: KnowledgeCollectionRepository,
    private val documentRepository: KnowledgeDocumentRepository,
    private val chunkRepository: KnowledgeChunkRepository,
    private val embeddingService: EmbeddingService,
    private val ingestionService: IngestionService,
) {
    // --- Collections ---

    fun createCollection(userId: UUID, request: CreateCollectionRequest): KnowledgeCollection {
        val collection = KnowledgeCollection(
            userId = userId,
            name = request.name,
            description = request.description,
        )
        return collectionRepository.save(collection)
    }

    fun listCollections(userId: UUID): List<KnowledgeCollection> =
        collectionRepository.findAllByUserId(userId).map { it.withDocumentCount() }

    /** Verifica posse e devolve a coleção já com `documentCount` preenchido. */
    fun getCollectionForUser(userId: UUID, id: UUID): KnowledgeCollection =
        requireOwnedCollection(userId, id).withDocumentCount()

    fun updateCollection(userId: UUID, id: UUID, request: UpdateCollectionRequest): KnowledgeCollection {
        val current = requireOwnedCollection(userId, id)
        val updated = current.copy(
            name = request.name ?: current.name,
            description = request.description ?: current.description,
            updatedAt = Instant.now(),
        )
        return collectionRepository.update(updated).withDocumentCount()
    }

    fun deleteCollection(userId: UUID, id: UUID) {
        requireOwnedCollection(userId, id)
        // Documentos e (por cascade de FK) seus chunks são removidos antes da coleção.
        documentRepository.deleteAllByCollectionId(id)
        collectionRepository.deleteById(id)
    }

    // --- Documents ---

    /** Cria o documento (status pending) e dispara a ingestão assíncrona; responde na hora. */
    fun uploadDocument(userId: UUID, collectionId: UUID, file: MultipartFile): KnowledgeDocument {
        requireOwnedCollection(userId, collectionId)
        if (file.isEmpty) throw BusinessRuleViolationException("Uploaded file is empty")
        // Bytes lidos na thread do request (o MultipartFile não sobrevive à resposta).
        val bytes = file.bytes
        val filename = sanitizeFilename(file.originalFilename)
        val document = documentRepository.save(
            KnowledgeDocument(
                collectionId = collectionId,
                filename = filename,
                mimeType = file.contentType,
                sizeBytes = file.size,
                status = DocumentStatus.PENDING,
            ),
        )
        ingestionService.ingestAsync(document.id, collectionId, bytes, filename, file.contentType)
        return document
    }

    fun listDocuments(userId: UUID, collectionId: UUID): List<KnowledgeDocument> {
        requireOwnedCollection(userId, collectionId)
        return documentRepository.findAllByCollectionId(collectionId)
    }

    fun getDocumentForUser(userId: UUID, collectionId: UUID, documentId: UUID): KnowledgeDocument {
        requireOwnedCollection(userId, collectionId)
        val document = documentRepository.findById(documentId) ?: throw DocumentNotFoundException()
        if (document.collectionId != collectionId) throw DocumentNotFoundException()
        return document
    }

    fun deleteDocument(userId: UUID, collectionId: UUID, documentId: UUID) {
        getDocumentForUser(userId, collectionId, documentId)
        // Chunks do documento são removidos por cascade de FK (ON DELETE CASCADE).
        documentRepository.deleteById(documentId)
    }

    // --- Search ---

    /** Busca por similaridade numa única coleção do usuário. */
    fun search(userId: UUID, collectionId: UUID, request: SearchRequest): List<ChunkSearchResult> {
        requireOwnedCollection(userId, collectionId)
        val queryEmbedding = embeddingService.embedQuery(request.query)
        return chunkRepository.search(listOf(collectionId), queryEmbedding, request.topK, request.minScore)
    }

    /** Busca por similaridade em várias coleções (caso de um agente com várias bases anexadas). */
    fun searchMulti(userId: UUID, request: MultiSearchRequest): List<ChunkSearchResult> {
        request.collectionIds.forEach { requireOwnedCollection(userId, it) }
        val queryEmbedding = embeddingService.embedQuery(request.query)
        return chunkRepository.search(request.collectionIds, queryEmbedding, request.topK, request.minScore)
    }

    // --- Helpers ---

    /** Garante que a coleção existe e pertence ao usuário; lança 404/403 caso contrário. */
    fun requireOwnedCollection(userId: UUID, id: UUID): KnowledgeCollection {
        val collection = collectionRepository.findById(id) ?: throw CollectionNotFoundException()
        if (collection.userId != userId) throw CollectionAccessDeniedException()
        return collection
    }

    private fun KnowledgeCollection.withDocumentCount(): KnowledgeCollection =
        copy(documentCount = documentRepository.countByCollectionId(this.id))

    private fun sanitizeFilename(original: String?): String {
        val name = original?.substringAfterLast('/')?.substringAfterLast('\\')?.trim()
        return name?.takeIf { it.isNotEmpty() } ?: "documento"
    }
}
