package com.apibot.features.knowledge.service

import org.springframework.stereotype.Service

/** Um trecho pronto para embedding: texto + estimativa de tokens. */
data class ChunkPiece(val content: String, val tokenCount: Int)

/**
 * Fatia o texto extraído em janelas de ~`TARGET_TOKENS` com sobreposição de ~`OVERLAP_TOKENS`,
 * respeitando quebras de parágrafo/linha quando possível. Contagem de tokens é aproximada
 * (~`CHARS_PER_TOKEN` chars/token) para não depender de um tokenizer específico do modelo — o objetivo
 * é limitar o tamanho do chunk, não medir custo exato.
 */
@Service
class ChunkingService {
    companion object {
        const val CHARS_PER_TOKEN = 4
        const val TARGET_TOKENS = 700
        const val OVERLAP_TOKENS = 100
        private const val MAX_CHARS = TARGET_TOKENS * CHARS_PER_TOKEN
        private const val OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN
    }

    fun chunk(rawText: String): List<ChunkPiece> {
        val text = rawText.replace("\r\n", "\n").replace('\r', '\n').trim()
        if (text.isEmpty()) return emptyList()

        // Blocos por linha não-vazia; blocos maiores que a janela são fatiados na força.
        val blocks = text.split("\n")
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .flatMap { block -> if (block.length <= MAX_CHARS) listOf(block) else block.chunked(MAX_CHARS) }

        val chunks = mutableListOf<ChunkPiece>()
        val current = StringBuilder()

        fun flush() {
            val content = current.toString().trim()
            if (content.isNotEmpty()) {
                chunks += ChunkPiece(content = content, tokenCount = estimateTokens(content))
            }
            current.setLength(0)
        }

        for (block in blocks) {
            val separator = if (current.isEmpty()) "" else "\n"
            if (current.length + separator.length + block.length > MAX_CHARS && current.isNotEmpty()) {
                val overlap = tailOverlap(current.toString())
                flush()
                current.append(overlap)
                if (current.isNotEmpty()) current.append("\n")
            }
            if (current.isNotEmpty()) current.append("\n")
            current.append(block)
        }
        flush()

        return chunks
    }

    private fun tailOverlap(text: String): String {
        if (text.length <= OVERLAP_CHARS) return text
        val tail = text.substring(text.length - OVERLAP_CHARS)
        // Começa na próxima fronteira de palavra para não cortar no meio de um token.
        val spaceIdx = tail.indexOf(' ')
        return if (spaceIdx in 0 until tail.length - 1) tail.substring(spaceIdx + 1) else tail
    }

    private fun estimateTokens(content: String): Int = (content.length + CHARS_PER_TOKEN - 1) / CHARS_PER_TOKEN
}
