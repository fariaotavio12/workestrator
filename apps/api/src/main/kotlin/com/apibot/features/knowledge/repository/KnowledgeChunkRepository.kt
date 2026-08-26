package com.apibot.features.knowledge.repository

import com.apibot.features.knowledge.model.ChunkSearchResult
import com.apibot.features.knowledge.model.KnowledgeChunk
import java.util.UUID

interface KnowledgeChunkRepository {
    fun saveAll(chunks: List<KnowledgeChunk>)
    fun deleteByDocumentId(documentId: UUID)
    /** `topKPerCollection` é por coleção, não no total — ver a implementação JDBC. */
    fun search(
        collectionIds: List<UUID>,
        queryEmbedding: FloatArray,
        topKPerCollection: Int,
        minScore: Double,
    ): List<ChunkSearchResult>
}
