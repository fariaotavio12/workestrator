package com.apibot.features.knowledge.embedding

import com.apibot.features.knowledge.domain.exception.EmbeddingProviderException
import com.apibot.shared.config.AiEmbeddingsProperties
import org.springframework.stereotype.Service

/**
 * Fachada de embeddings — escolhe a implementação (`EmbeddingProvider`) conforme
 * `app.ai.embeddings.provider`. Novos providers são adicionados só implementando `EmbeddingProvider`
 * como `@Component` (auto-injetados aqui pela lista).
 */
@Service
class EmbeddingService(
    providers: List<EmbeddingProvider>,
    private val properties: AiEmbeddingsProperties,
) {
    private val byKey: Map<String, EmbeddingProvider> = providers.associateBy { it.key }

    private fun active(): EmbeddingProvider =
        byKey[properties.provider]
            ?: throw EmbeddingProviderException("Unknown embeddings provider '${properties.provider}'")

    fun embed(texts: List<String>): List<FloatArray> = active().embed(texts)

    fun embedQuery(text: String): FloatArray = active().embedQuery(text)
}
