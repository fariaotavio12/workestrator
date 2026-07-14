package com.apibot.features.knowledge.embedding

import com.apibot.features.knowledge.domain.exception.EmbeddingProviderException
import com.apibot.shared.config.AiEmbeddingsProperties
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException

/** Embeddings via Voyage AI (recomendado pela Anthropic). Endpoint: POST /v1/embeddings. */
@Component
class VoyageEmbeddingProvider(
    private val restClient: RestClient,
    private val properties: AiEmbeddingsProperties,
) : EmbeddingProvider {
    override val key = "voyage"

    override fun embed(texts: List<String>): List<FloatArray> {
        if (texts.isEmpty()) return emptyList()
        val apiKey = properties.voyage.apiKey
        if (apiKey.isBlank()) throw EmbeddingProviderException("Voyage API key not configured")

        val model = properties.model.takeUnless { it.isBlank() || it.startsWith("text-embedding") } ?: "voyage-3"
        val response = try {
            restClient.post()
                .uri("https://api.voyageai.com/v1/embeddings")
                .headers { it.setBearerAuth(apiKey) }
                .contentType(MediaType.APPLICATION_JSON)
                .body(mapOf("input" to texts, "model" to model))
                .retrieve()
                .body(EmbeddingApiResponse::class.java)
        } catch (exception: RestClientException) {
            throw EmbeddingProviderException("Voyage embeddings request failed: ${exception.message}")
        }

        val items = response?.data ?: throw EmbeddingProviderException("Empty Voyage embeddings response")
        return items.sortedBy { it.index }.map { it.embedding }
    }
}
