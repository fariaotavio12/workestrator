package com.apibot.features.knowledge.service

import com.apibot.features.knowledge.embedding.EmbeddingService
import com.apibot.features.knowledge.model.DocumentStatus
import com.apibot.features.knowledge.model.KnowledgeChunk
import com.apibot.features.knowledge.repository.KnowledgeChunkRepository
import com.apibot.features.knowledge.repository.KnowledgeDocumentRepository
import org.apache.tika.Tika
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import java.io.ByteArrayInputStream
import java.time.Instant
import java.util.UUID

/**
 * Pipeline de ingestão assíncrona de um documento: (opcional) guarda o arquivo cru no R2, extrai texto
 * com Tika, fatia em chunks, gera embeddings em lote e persiste os chunks. Atualiza `status` do documento
 * ao longo do caminho (`processing` → `ready`/`failed`). Roda em thread separada (`@Async`) para o upload
 * responder na hora.
 */
@Service
class IngestionService(
    private val documentRepository: KnowledgeDocumentRepository,
    private val chunkRepository: KnowledgeChunkRepository,
    private val chunkingService: ChunkingService,
    private val embeddingService: EmbeddingService,
    private val fileStorage: KnowledgeFileStorage,
) {
    private val log = LoggerFactory.getLogger(IngestionService::class.java)

    private val tika = Tika().apply { maxStringLength = MAX_TEXT_CHARS }

    companion object {
        private const val MAX_TEXT_CHARS = 10_000_000
        private const val EMBED_BATCH = 64
    }

    @Async
    fun ingestAsync(
        documentId: UUID,
        collectionId: UUID,
        bytes: ByteArray,
        filename: String,
        contentType: String?,
    ) {
        updateStatus(documentId, DocumentStatus.PROCESSING, errorMessage = null)
        try {
            val r2Url = runCatching {
                fileStorage.storeRaw(bytes, filename, contentType, collectionId, documentId)
            }.getOrNull()

            val text = tika.parseToString(ByteArrayInputStream(bytes))
            val pieces = chunkingService.chunk(text)

            if (pieces.isEmpty()) {
                markReady(documentId, r2Url, chunkCount = 0)
                return
            }

            val embeddings = pieces.map { it.content }
                .chunked(EMBED_BATCH)
                .flatMap { embeddingService.embed(it) }

            val chunks = pieces.mapIndexed { index, piece ->
                KnowledgeChunk(
                    id = UUID.randomUUID(),
                    documentId = documentId,
                    collectionId = collectionId,
                    ordinal = index,
                    content = piece.content,
                    tokenCount = piece.tokenCount,
                    embedding = embeddings[index],
                )
            }

            // Reprocesso idempotente: limpa chunks antigos deste documento antes de gravar os novos.
            chunkRepository.deleteByDocumentId(documentId)
            chunkRepository.saveAll(chunks)
            markReady(documentId, r2Url, chunkCount = chunks.size)
        } catch (exception: Exception) {
            log.error("Falha na ingestão do documento {}: {}", documentId, exception.message, exception)
            updateStatus(documentId, DocumentStatus.FAILED, errorMessage = exception.message?.take(2000))
        }
    }

    private fun markReady(documentId: UUID, r2Url: String?, chunkCount: Int) {
        val document = documentRepository.findById(documentId) ?: return
        documentRepository.update(
            document.copy(
                status = DocumentStatus.READY,
                r2Url = r2Url ?: document.r2Url,
                chunkCount = chunkCount,
                errorMessage = null,
                updatedAt = Instant.now(),
            ),
        )
    }

    private fun updateStatus(documentId: UUID, status: DocumentStatus, errorMessage: String?) {
        val document = documentRepository.findById(documentId) ?: return
        documentRepository.update(
            document.copy(status = status, errorMessage = errorMessage, updatedAt = Instant.now()),
        )
    }
}
