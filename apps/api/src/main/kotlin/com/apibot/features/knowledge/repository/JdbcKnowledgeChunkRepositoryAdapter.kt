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

    /**
     * Top-K **por coleção**, não no conjunto. Com `LIMIT` global, uma base cujos trechos pontuam mais alto
     * (o caso real: a base de lições do treinamento, gerada a partir do próprio run, é sempre a mais
     * parecida com a consulta) leva todas as vagas e as outras bases anexadas ao agente somem do prompt.
     * O `ROW_NUMBER` particionado garante que cada base disputa só contra si mesma; a ordenação por score
     * no fim mantém o resultado global ordenado para quem consome.
     */
    override fun search(
        collectionIds: List<UUID>,
        queryEmbedding: FloatArray,
        topKPerCollection: Int,
        minScore: Double,
    ): List<ChunkSearchResult> {
        if (collectionIds.isEmpty()) return emptyList()
        val sql = """
            WITH ranked AS (
                SELECT c.id AS chunk_id,
                       c.document_id AS document_id,
                       c.collection_id AS collection_id,
                       d.filename AS filename,
                       c.content AS content,
                       1 - (c.embedding <=> CAST(:queryVec AS vector)) AS score,
                       ROW_NUMBER() OVER (
                           PARTITION BY c.collection_id
                           ORDER BY c.embedding <=> CAST(:queryVec AS vector)
                       ) AS rank_in_collection
                FROM knowledge_chunk c
                JOIN knowledge_document d ON d.id = c.document_id
                WHERE c.collection_id IN (:collectionIds)
            )
            SELECT chunk_id, document_id, collection_id, filename, content, score
            FROM ranked
            WHERE rank_in_collection <= :perCollection
            ORDER BY score DESC
        """.trimIndent()

        val params = MapSqlParameterSource()
            .addValue("queryVec", toVectorLiteral(queryEmbedding))
            .addValue("collectionIds", collectionIds)
            .addValue("perCollection", topKPerCollection.coerceIn(1, 50))

        return namedJdbc.query(sql, params) { rs, _ ->
            ChunkSearchResult(
                chunkId = rs.getObject("chunk_id", UUID::class.java),
                documentId = rs.getObject("document_id", UUID::class.java),
                collectionId = rs.getObject("collection_id", UUID::class.java),
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
