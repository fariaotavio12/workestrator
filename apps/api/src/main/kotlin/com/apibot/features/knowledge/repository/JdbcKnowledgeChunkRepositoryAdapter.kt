package com.apibot.features.knowledge.repository

import com.apibot.features.knowledge.model.ChunkSearchResult
import com.apibot.features.knowledge.model.KnowledgeChunk
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.util.UUID

/**
 * Acesso à tabela `knowledge_chunk` por SQL nativo — a coluna `embedding` usa o tipo `vector`
 * (extensão pgvector), fora do mapeamento do Hibernate. Insert e busca por similaridade (cosine, `<=>`)
 * vivem aqui. O vetor é passado como literal textual (`[a,b,c]`) e convertido no SQL com `CAST(... AS vector)`.
 */
@Repository
class JdbcKnowledgeChunkRepositoryAdapter(
    private val jdbcTemplate: JdbcTemplate,
    private val namedJdbc: NamedParameterJdbcTemplate,
) : KnowledgeChunkRepository {

    override fun saveAll(chunks: List<KnowledgeChunk>) {
        if (chunks.isEmpty()) return
        val sql = """
            INSERT INTO knowledge_chunk (id, document_id, collection_id, ordinal, content, token_count, embedding)
            VALUES (?, ?, ?, ?, ?, ?, CAST(? AS vector))
        """.trimIndent()
        jdbcTemplate.batchUpdate(sql, chunks, chunks.size) { ps, chunk ->
            ps.setObject(1, chunk.id)
            ps.setObject(2, chunk.documentId)
            ps.setObject(3, chunk.collectionId)
            ps.setInt(4, chunk.ordinal)
            ps.setString(5, chunk.content)
            ps.setInt(6, chunk.tokenCount)
            ps.setString(7, toVectorLiteral(chunk.embedding))
        }
    }

    override fun deleteByDocumentId(documentId: UUID) {
        jdbcTemplate.update("DELETE FROM knowledge_chunk WHERE document_id = ?", documentId)
    }

    override fun search(
        collectionIds: List<UUID>,
        queryEmbedding: FloatArray,
        topK: Int,
        minScore: Double,
    ): List<ChunkSearchResult> {
        if (collectionIds.isEmpty()) return emptyList()
        val sql = """
            SELECT c.id AS chunk_id,
                   c.document_id AS document_id,
                   d.filename AS filename,
                   c.content AS content,
                   1 - (c.embedding <=> CAST(:queryVec AS vector)) AS score
            FROM knowledge_chunk c
            JOIN knowledge_document d ON d.id = c.document_id
            WHERE c.collection_id IN (:collectionIds)
            ORDER BY c.embedding <=> CAST(:queryVec AS vector)
            LIMIT :limit
        """.trimIndent()

        val params = MapSqlParameterSource()
            .addValue("queryVec", toVectorLiteral(queryEmbedding))
            .addValue("collectionIds", collectionIds)
            .addValue("limit", topK.coerceIn(1, 50))

        return namedJdbc.query(sql, params) { rs, _ ->
            ChunkSearchResult(
                chunkId = rs.getObject("chunk_id", UUID::class.java),
                documentId = rs.getObject("document_id", UUID::class.java),
                filename = rs.getString("filename"),
                content = rs.getString("content"),
                score = rs.getDouble("score"),
            )
        }.filter { it.score >= minScore }
    }

    /** Serializa o vetor no formato aceito pelo pgvector: `[0.1,0.2,...]` (ponto decimal, sem espaços). */
    private fun toVectorLiteral(embedding: FloatArray): String =
        embedding.joinToString(prefix = "[", postfix = "]", separator = ",") { it.toString() }
}
