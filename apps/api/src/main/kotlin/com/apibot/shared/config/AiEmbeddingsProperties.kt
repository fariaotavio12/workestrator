package com.apibot.shared.config

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * Configuração dos embeddings usados no RAG (base de conhecimento). Provider selecionável em runtime
 * via `app.ai.embeddings.provider` (`voyage` | `openai`) — ver `EmbeddingProvider` e suas implementações.
 *
 * `dimensions` documenta a dimensão do modelo escolhido (voyage-3 = 1024, openai
 * text-embedding-3-small = 1536). A coluna `knowledge_chunk.embedding` é criada como `vector` sem N
 * fixo (schema.sql), então trocar de provider não recria a coluna — mas exige **re-ingestão** dos
 * documentos, pois vetores de dimensões diferentes não são comparáveis entre si.
 */
@ConfigurationProperties(prefix = "app.ai.embeddings")
data class AiEmbeddingsProperties(
    val provider: String = "voyage",
    val model: String = "voyage-3",
    val dimensions: Int = 1024,
    val voyage: ProviderKey = ProviderKey(),
    val openai: ProviderKey = ProviderKey(),
) {
    data class ProviderKey(val apiKey: String = "")
}
