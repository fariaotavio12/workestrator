package com.apibot.features.knowledge.embedding

import com.apibot.features.knowledge.domain.exception.EmbeddingProviderException
import com.apibot.shared.config.AiEmbeddingsProperties
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException

/** Embeddings via OpenAI. Endpoint: POST /v1/embeddings (compatível com o formato de resposta da Voyage). */
@Component
class OpenAiEmbeddingProvider(
    private val restClient: RestClient,
    private val properties: AiEmbeddingsProperties,
) : EmbeddingProvider {
    override val key = "openai"

    override fun embed(texts: List<String>): List<FloatArray> {
        if (texts.isEmpty()) return emptyList()
        val apiKey = properties.openai.apiKey
        if (apiKey.isBlank()) throw EmbeddingProviderException("OpenAI API key not configured")

        val model = properties.model.takeUnless { it.isBlank() || it.startsWith("voyage") } ?: "text-embedding-3-small"
        val response = try {
            restClient.post()
                .uri("https://api.openai.com/v1/embeddings")
                .headers { it.setBearerAuth(apiKey) }
                .contentType(MediaType.APPLICATION_JSON)
                .body(mapOf("input" to texts, "model" to model))
                .retrieve()
                .body(EmbeddingApiResponse::class.java)
        } catch (exception: RestClientException) {
            throw EmbeddingProviderException("OpenAI embeddings request failed: ${exception.message}")
        }

        val items = response?.data ?: throw EmbeddingProviderException("Empty OpenAI embeddings response")
        return items.sortedBy { it.index }.map { it.embedding }
    }
}
