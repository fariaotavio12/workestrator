package com.apibot.features.knowledge.model

import com.apibot.features.knowledge.dto.KnowledgeDocumentResponse
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue
import java.time.Instant
import java.util.UUID

enum class DocumentStatus(@JsonValue val value: String) {
    PENDING("pending"),
    PROCESSING("processing"),
    READY("ready"),
    FAILED("failed"),
    ;

    companion object {
        @JsonCreator
        @JvmStatic
        fun fromValue(value: String): DocumentStatus =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unknown document status: $value")
    }
}

/**
 * Documento enviado a uma coleção. O arquivo cru é opcionalmente guardado no R2 (`r2Url`); o essencial
 * (texto extraído em chunks + embeddings) vive em `knowledge_chunk`. `status` reflete o pipeline de
 * ingestão assíncrona (ver `IngestionService`).
 */
data class KnowledgeDocument(
    val id: UUID = UUID.randomUUID(),
    val collectionId: UUID,
    val filename: String,
    val mimeType: String? = null,
    val sizeBytes: Long = 0,
    val r2Url: String? = null,
    val status: DocumentStatus = DocumentStatus.PENDING,
    val errorMessage: String? = null,
    val chunkCount: Int = 0,
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now(),
)

fun KnowledgeDocument.toResponse(): KnowledgeDocumentResponse = KnowledgeDocumentResponse(
    id = this.id,
    collectionId = this.collectionId,
    filename = this.filename,
    mimeType = this.mimeType,
    sizeBytes = this.sizeBytes,
    r2Url = this.r2Url,
    status = this.status,
    errorMessage = this.errorMessage,
    chunkCount = this.chunkCount,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
