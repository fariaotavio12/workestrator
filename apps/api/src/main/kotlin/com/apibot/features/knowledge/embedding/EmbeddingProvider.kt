package com.apibot.features.knowledge.embedding

import com.fasterxml.jackson.annotation.JsonIgnoreProperties

/**
 * Abstração de um provider de embeddings. Implementações concretas (Voyage, OpenAI) são selecionadas
 * em runtime por `EmbeddingService` conforme `app.ai.embeddings.provider`. Trocar de provider muda a
 * dimensão dos vetores — exige re-ingestão (ver `AiEmbeddingsProperties`).
 */
interface EmbeddingProvider {
    /** Chave que casa com `app.ai.embeddings.provider` (ex.: "voyage", "openai"). */
    val key: String

    /** Gera um embedding por texto de entrada, na mesma ordem. */
    fun embed(texts: List<String>): List<FloatArray>

    /** Conveniência para uma única query. */
    fun embedQuery(text: String): FloatArray = embed(listOf(text)).first()
}

/** Formato comum de resposta de Voyage e OpenAI (`{ "data": [{ "embedding": [...], "index": n }] }`). */
@JsonIgnoreProperties(ignoreUnknown = true)
data class EmbeddingApiResponse(
    val data: List<EmbeddingApiItem> = emptyList(),
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class EmbeddingApiItem(
    val embedding: FloatArray = FloatArray(0),
    val index: Int = 0,
)
