package com.apibot.features.knowledge.repository

import com.apibot.features.knowledge.model.ChunkSearchResult
import com.apibot.features.knowledge.model.KnowledgeChunk
import java.util.UUID

interface KnowledgeChunkRepository {
    fun saveAll(chunks: List<KnowledgeChunk>)
    fun deleteByDocumentId(documentId: UUID)
    fun search(
        collectionIds: List<UUID>,
        queryEmbedding: FloatArray,
        topK: Int,
        minScore: Double,
    ): List<ChunkSearchResult>
}
