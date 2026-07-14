package com.apibot.features.knowledge.model

import com.apibot.features.knowledge.dto.ChunkSearchResponse
import java.util.UUID

/**
 * Trecho de um documento + seu embedding. Persistido na tabela `knowledge_chunk` (coluna `vector`),
 * acessada por SQL nativo (JdbcTemplate) — não é uma entidade JPA, porque o tipo `vector` da extensão
 * pgvector fica fora do mapeamento do Hibernate (ver schema.sql).
 */
data class KnowledgeChunk(
    val id: UUID = UUID.randomUUID(),
    val documentId: UUID,
    val collectionId: UUID,
    val ordinal: Int,
    val content: String,
    val tokenCount: Int,
    val embedding: FloatArray,
)

/** Resultado de uma busca por similaridade — trecho + origem + score (0..1, quanto maior mais próximo). */
data class ChunkSearchResult(
    val chunkId: UUID,
    val documentId: UUID,
    val filename: String,
    val content: String,
    val score: Double,
)

fun ChunkSearchResult.toResponse(): ChunkSearchResponse = ChunkSearchResponse(
    chunkId = this.chunkId,
    documentId = this.documentId,
    filename = this.filename,
    content = this.content,
    score = this.score,
)
