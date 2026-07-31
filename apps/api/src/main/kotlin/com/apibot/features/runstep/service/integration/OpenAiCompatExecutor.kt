package com.apibot.features.runstep.service.integration

import com.apibot.features.runstep.dto.RunStepRequest
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.ObjectNode
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.io.BufferedReader
import java.io.IOException
import java.io.InputStream
import java.io.InputStreamReader
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets
import java.time.Duration
import java.util.UUID

private const val MAX_TOOL_ITERATIONS = 8
private const val THINKING_FLUSH_CHARS = 240

private data class ChatTurn(val text: String, val reasoning: String, val toolCalls: List<ToolCallAccumulator>)
private data class ToolCallAccumulator(val id: String, val name: String, val arguments: String)
private data class TextToolCall(val name: String, val arguments: String)
private class MutableToolCall {
    var id: String = ""
    var name: String = ""
    var arguments: String = ""
}

private const val THINK_OPEN = "<think>"
private const val THINK_CLOSE = "</think>"

private class ThinkTagFilter {
    private enum class Mode { TEXT, THINKING }
    private var mode = Mode.TEXT
    private val carry = StringBuilder()

    data class Piece(val text: String, val reasoning: String)

    fun feed(chunk: String): Piece {
        carry.append(chunk)
        val text = StringBuilder()
        val reasoning = StringBuilder()
        while (true) {
            val buf = carry.toString()
            val marker = if (mode == Mode.TEXT) THINK_OPEN else THINK_CLOSE
            val idx = buf.indexOf(marker, ignoreCase = true)
            if (idx >= 0) {
                val before = buf.substring(0, idx)
                if (mode == Mode.TEXT) text.append(before) else reasoning.append(before)
                carry.setLength(0)
                carry.append(buf.substring(idx + marker.length))
                mode = if (mode == Mode.TEXT) Mode.THINKING else Mode.TEXT
                continue
            }
            val holdBack = partialSuffixLength(buf, marker)
            val safeLen = buf.length - holdBack
            if (safeLen > 0) {
                val safe = buf.substring(0, safeLen)
                if (mode == Mode.TEXT) text.append(safe) else reasoning.append(safe)
                carry.setLength(0)
                carry.append(buf.substring(safeLen))
            }
            break
        }
        return Piece(text.toString(), reasoning.toString())
    }

    /** Descarrega o que sobrou no carry quando o stream acaba, atribuído ao modo atual. */
    fun finish(): Piece {
        val remaining = carry.toString()
        carry.setLength(0)
        return if (mode == Mode.TEXT) Piece(remaining, "") else Piece("", remaining)
    }

    private fun partialSuffixLength(buf: String, marker: String): Int {
        val maxLen = minOf(buf.length, marker.length - 1)
        for (len in maxLen downTo 1) {
            if (marker.startsWith(buf.substring(buf.length - len), ignoreCase = true)) return len
        }
        return 0
    }
}

/**
 * Calls an OpenAI chat-completions-compatible endpoint (Ollama, vLLM, LM Studio, OpenRouter, OpenAI
 * itself...), running the function-calling loop when the agent has network tools attached. A Kotlin
 * port of `callOpenAiCompat`/`readChatResponse` from the Electron runner
 * (`apps/web/electron/runner/runner.ts`) — this is the only real HTTP execution path today; a direct
 * Anthropic Messages API path (`providerKind = anthropic-api`) doesn't exist yet on either transport
 * (see `RunStepService`, which rejects it explicitly rather than silently misrouting it here).
 */
@Component
class OpenAiCompatExecutor(
    private val authResolver: ProviderAuthResolver,
    private val httpToolRunner: HttpToolRunner,
    private val httpClient: HttpClient,
    private val objectMapper: ObjectMapper,
) {
    private val logger = LoggerFactory.getLogger(OpenAiCompatExecutor::class.java)

    fun execute(userId: UUID, request: RunStepRequest, emitter: SseEmitter) {
        val auth = authResolver.resolveProviderAuth(userId, request.apiKeyRef)
        val baseUrl = requireNotNull(request.baseUrl).trimEnd('/')
        val model = resolveModel(baseUrl, auth, request.model)
        val url = "$baseUrl/chat/completions${auth.querySuffix}"

        val tools = httpToolRunner.resolveTools(userId, request.scripts)
        val toolsByName = tools.associateBy { it.definition.name }

        val messages = mutableListOf<ObjectNode>()
        if (!request.systemPrompt.isNullOrBlank()) messages.add(chatMessage("system", request.systemPrompt))
        messages.add(chatMessage("user", request.prompt))

        var output = ""
        var lastReasoning = ""
        var ranTools = false

        for (iteration in 0 until MAX_TOOL_ITERATIONS) {
            val body = objectMapper.createObjectNode().apply {
                put("model", model)
                put("stream", true)
                replace("messages", objectMapper.valueToTree(messages))
                if (tools.isNotEmpty()) {
                    replace("tools", objectMapper.valueToTree(tools.map { toolPayload(it) }))
                    put("tool_choice", "auto")
                }
            }

            val httpRequestBuilder = HttpRequest.newBuilder(URI.create(url))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(180))
            auth.headers.forEach { (key, value) -> httpRequestBuilder.header(key, value) }
            httpRequestBuilder.POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))

            val response = try {
                httpClient.send(httpRequestBuilder.build(), HttpResponse.BodyHandlers.ofInputStream())
            } catch (ex: IOException) {
                emitError(emitter, "unknown", "Não foi possível conectar em $url (${ex.message ?: "erro desconhecido"}).")
                return
            }

            if (response.statusCode() !in 200..299) {
                val detail = response.body().bufferedReader(StandardCharsets.UTF_8).use { it.readText() }
                if (response.statusCode() == 400 && tools.isNotEmpty() && Regex("tool|function", RegexOption.IGNORE_CASE).containsMatchIn(detail)) {
                    emitError(
                        emitter,
                        "unknown",
                        "O modelo \"$model\" não aceita ferramentas (function calling), mas este agent tem ferramentas anexadas. " +
                            "Troque para um modelo com suporte a tools ou remova as ferramentas do agent. Detalhe: $detail",
                    )
                    return
                }
                val (code, message) = classifyHttpFailure(response.statusCode(), detail)
                emitError(emitter, code, message)
                return
            }

            val turn = readChatResponse(response, emitter)
            if (turn.reasoning.isNotBlank()) lastReasoning = turn.reasoning

            // Fallback pra modelos sem tool parser nativo no servidor (Gemma no vLLM, vários modelos no
            // Ollama): a call vem como texto no `content` em vez do campo `tool_calls` estruturado — sem
            // isso a "chamada" vaza como resposta final do agente e o coordenador redispacha em loop
            // (porta de `parseTextToolCalls` em `electron/runner/openai-tools.ts`).
            val toolCalls = turn.toolCalls.ifEmpty {
                if (tools.isNotEmpty()) {
                    parseTextToolCalls(turn.text, toolsByName.keys).mapIndexed { index, call ->
                        ToolCallAccumulator("text_${iteration}_$index", call.name, call.arguments)
                    }
                } else {
                    emptyList()
                }
            }

            if (toolCalls.isEmpty()) {
                output = turn.text
                break
            }

            messages.add(assistantMessage(turn.text, toolCalls))

            for (call in toolCalls) {
                val tool = toolsByName[call.name]
                emitEvent(emitter, "tool_use", ToolUseEvent(call.id, call.name, call.name, call.arguments))

                if (tool == null) {
                    val available = toolsByName.keys.joinToString(", ").ifBlank { "(nenhuma)" }
                    val text = "Ferramenta \"${call.name}\" não existe. Disponíveis: $available."
                    messages.add(toolMessage(call.id, text))
                    emitEvent(emitter, "tool_result", ToolResultEvent(call.id, false, call.name, text))
                    continue
                }

                ranTools = true
                val args = runCatching { parseArguments(call.arguments) }.getOrElse {
                    val text = "Argumentos inválidos (não são JSON): ${call.arguments}"
                    messages.add(toolMessage(call.id, text))
                    emitEvent(emitter, "tool_result", ToolResultEvent(call.id, false, call.name, text))
                    continue
                }

                val result = tool.execute(args)
                messages.add(toolMessage(call.id, result.text))
                emitEvent(emitter, "tool_result", ToolResultEvent(call.id, result.ok, call.name, result.text))
            }
        }

        if (output.isBlank()) {
            val thoughtOnly = !ranTools && lastReasoning.isNotBlank()
            val message = when {
                ranTools ->
                    "O agent usou as ferramentas mas não fechou uma resposta em $MAX_TOOL_ITERATIONS rodadas. " +
                        "Reduza o escopo do passo ou peça um formato de saída mais direto no prompt."
                thoughtOnly ->
                    "O modelo \"$model\" raciocinou mas não produziu resposta final (só \"reasoning\", com o conteúdo vazio). " +
                        "Isso costuma acontecer quando o prompt é ambíguo sobre o formato de saída, ou quando o raciocínio consome o limite de contexto. " +
                        "Peça um formato de saída explícito no prompt do agent, ou use um modelo sem \"thinking\". " +
                        "Fim do raciocínio: \"…${lastReasoning.trim().takeLast(400)}\""
                else -> "O endpoint não retornou nenhum texto."
            }
            emitError(emitter, "unknown", message)
        } else {
            emitEvent(emitter, "done", DoneEvent(output.trim()))
            completeEmitter(emitter)
        }
    }

    private fun parseArguments(json: String): Map<String, Any?> =
        if (json.isBlank()) {
            emptyMap()
        } else {
            objectMapper.readValue(json, object : TypeReference<Map<String, Any?>>() {})
        }

    private fun readChatResponse(response: HttpResponse<InputStream>, emitter: SseEmitter): ChatTurn {
        val contentType = response.headers().firstValue("content-type").orElse("")
        val isStream = contentType.contains("text/event-stream")

        if (!isStream) {
            val raw = response.body().bufferedReader(StandardCharsets.UTF_8).use { it.readText() }
            val message = runCatching { objectMapper.readTree(raw) }.getOrNull()?.get("choices")?.get(0)?.get("message")
            val rawText = message?.get("content")?.takeIf { !it.isNull }?.asText() ?: ""
            val filter = ThinkTagFilter()
            val piece = filter.feed(rawText)
            val tail = filter.finish()
            val text = piece.text + tail.text
            val reasoning = readReasoning(message) + piece.reasoning + tail.reasoning
            if (text.isNotEmpty()) emitEvent(emitter, "chunk", ChunkEvent(text))
            if (reasoning.isNotEmpty()) emitEvent(emitter, "thinking", ThinkingEvent(reasoning))
            val toolCalls = message?.get("tool_calls")?.let { parseToolCallsArray(it) } ?: emptyList()
            return ChatTurn(text, reasoning, toolCalls)
        }

        val reader = BufferedReader(InputStreamReader(response.body(), StandardCharsets.UTF_8))
        var text = ""
        var reasoning = ""
        var thinkingBuffer = ""
        val pending = linkedMapOf<Int, MutableToolCall>()
        val thinkFilter = ThinkTagFilter()

        fun flushThinking(force: Boolean) {
            if (thinkingBuffer.isEmpty() || (!force && thinkingBuffer.length < THINKING_FLUSH_CHARS)) return
            emitEvent(emitter, "thinking", ThinkingEvent(thinkingBuffer))
            thinkingBuffer = ""
        }

        reader.lineSequence().forEach lines@{ line ->
            val trimmed = line.trim()
            if (!trimmed.startsWith("data:")) return@lines
            val data = trimmed.removePrefix("data:").trim()
            if (data.isEmpty() || data == "[DONE]") return@lines
            val node = runCatching { objectMapper.readTree(data) }.getOrNull() ?: return@lines
            val delta = node.get("choices")?.get(0)?.get("delta") ?: return@lines

            val content = delta.get("content")?.takeIf { !it.isNull }?.asText()
            if (!content.isNullOrEmpty()) {
                val piece = thinkFilter.feed(content)
                if (piece.text.isNotEmpty()) {
                    text += piece.text
                    emitEvent(emitter, "chunk", ChunkEvent(piece.text))
                }
                if (piece.reasoning.isNotEmpty()) {
                    reasoning += piece.reasoning
                    thinkingBuffer += piece.reasoning
                    flushThinking(false)
                }
            }
            val reasoningDelta = readReasoning(delta)
            if (reasoningDelta.isNotEmpty()) {
                reasoning += reasoningDelta
                thinkingBuffer += reasoningDelta
                flushThinking(false)
            }
            delta.get("tool_calls")?.forEach { call ->
                val index = call.get("index")?.asInt() ?: 0
                val entry = pending.getOrPut(index) { MutableToolCall() }
                call.get("id")?.asText()?.let { entry.id = it }
                call.get("function")?.get("name")?.asText()?.let { entry.name = it }
                call.get("function")?.get("arguments")?.asText()?.let { entry.arguments += it }
            }
        }

        val tail = thinkFilter.finish()
        if (tail.text.isNotEmpty()) {
            text += tail.text
            emitEvent(emitter, "chunk", ChunkEvent(tail.text))
        }
        if (tail.reasoning.isNotEmpty()) {
            reasoning += tail.reasoning
            thinkingBuffer += tail.reasoning
        }
        flushThinking(true)

        val toolCalls = pending.entries
            .sortedBy { it.key }
            .filter { it.value.name.isNotEmpty() }
            .map { (index, entry) -> ToolCallAccumulator(entry.id.ifEmpty { "call_$index" }, entry.name, entry.arguments.ifEmpty { "{}" }) }

        return ChatTurn(text, reasoning, toolCalls)
    }

    private fun readReasoning(node: JsonNode?): String {
        if (node == null) return ""
        val reasoning = node.get("reasoning")?.takeIf { !it.isNull }?.asText()
        if (!reasoning.isNullOrEmpty()) return reasoning
        return node.get("reasoning_content")?.takeIf { !it.isNull }?.asText() ?: ""
    }

    private fun parseToolCallsArray(node: JsonNode): List<ToolCallAccumulator> =
        node.mapIndexed { index, call ->
            val id = call.get("id")?.asText()?.takeIf { it.isNotEmpty() } ?: "call_$index"
            val name = call.get("function")?.get("name")?.asText() ?: ""
            val arguments = call.get("function")?.get("arguments")?.asText() ?: "{}"
            ToolCallAccumulator(id, name, arguments)
        }.filter { it.name.isNotEmpty() }

    /** Lê o objeto `{...}` balanceado a partir de `start` (índice de um `{`), respeitando strings/escapes. */
    private fun readBalancedObject(text: String, start: Int): String? {
        var depth = 0
        var inString = false
        var escaped = false
        for (i in start until text.length) {
            val ch = text[i]
            if (inString) {
                when {
                    escaped -> escaped = false
                    ch == '\\' -> escaped = true
                    ch == '"' -> inString = false
                }
                continue
            }
            when (ch) {
                '"' -> inString = true
                '{' -> depth++
                '}' -> {
                    depth--
                    if (depth == 0) return text.substring(start, i + 1)
                }
            }
        }
        return null
    }

    /**
     * Recupera tool calls que o modelo escreveu como TEXTO no `content` em vez do campo estruturado
     * `tool_calls` — acontece quando o servidor não tem parser de tool nativo pro template do modelo
     * (Gemma no vLLM é o caso clássico: `call:gerar-autentica-o{}` cru no conteúdo). Cobre os dialetos
     * comuns e SEMPRE ancora nos nomes de tools registradas (`known`), pra prosa solta não virar chamada
     * por engano. Porta de `parseTextToolCalls` em `electron/runner/openai-tools.ts` — mantida em sync.
     */
    private fun parseTextToolCalls(text: String, known: Set<String>): List<TextToolCall> {
        if (text.isBlank() || known.isEmpty()) return emptyList()
        val calls = mutableListOf<TextToolCall>()

        fun add(name: String, rawArgs: Any?) {
            if (name !in known) return
            val args = when {
                rawArgs == null -> "{}"
                rawArgs is JsonNode && rawArgs.isNull -> "{}"
                rawArgs is String -> rawArgs.trim().ifEmpty { "{}" }
                rawArgs is JsonNode -> objectMapper.writeValueAsString(rawArgs)
                else -> "{}"
            }
            calls.add(TextToolCall(name, args))
        }

        // 1) Hermes/Qwen: <tool_call>{"name":"x","arguments":{...}}</tool_call> (pode repetir).
        Regex("<tool_call>\\s*([\\s\\S]*?)\\s*</tool_call>", RegexOption.IGNORE_CASE).findAll(text).forEach { m ->
            runCatching {
                val obj = objectMapper.readTree(m.groupValues[1])
                val name = obj.get("name")?.takeIf { it.isTextual }?.asText()
                if (name != null) add(name, obj.get("arguments") ?: obj.get("parameters"))
            }
        }
        if (calls.isNotEmpty()) return calls

        // 2) Mistral: [TOOL_CALLS][{"name":"x","arguments":{...}}, ...]
        Regex("\\[TOOL_CALLS]\\s*(\\[[\\s\\S]*])").find(text)?.let { m ->
            runCatching {
                objectMapper.readTree(m.groupValues[1]).forEach { obj ->
                    val name = obj.get("name")?.takeIf { it.isTextual }?.asText()
                    if (name != null) add(name, obj.get("arguments"))
                }
            }
        }
        if (calls.isNotEmpty()) return calls

        // 3) Dialeto observado no Gemma: `call:<nome>{args}` — também `call: nome (args)`, `tool_call`,
        //    `function`. Os args (quando há) são o `{...}` balanceado que vem logo após o nome.
        val prefix = Regex("""\b(?:call|tool_call|function|tool)\b\s*[:=]?\s*["'`]?([a-zA-Z0-9_.-]+)["'`]?""", RegexOption.IGNORE_CASE)
        prefix.findAll(text).forEach { m ->
            val name = m.groupValues[1]
            if (name in known) {
                val after = m.range.last + 1
                val brace = text.indexOf('{', after)
                // só cola os args se o `{` vier imediatamente depois do nome (só espaço/parêntese no meio).
                val gap = if (brace >= 0) text.substring(after, brace) else ""
                val argsText = if (brace >= 0 && Regex("^[\\s(]*$").matches(gap)) readBalancedObject(text, brace) else null
                add(name, argsText)
            }
        }
        if (calls.isNotEmpty()) return calls

        // 4) JSON solto (às vezes em bloco ```json): { "name"|"tool": "<tool>", "arguments"|"parameters": {...} }.
        var i = text.indexOf('{')
        while (i >= 0) {
            val block = readBalancedObject(text, i) ?: break
            runCatching {
                val obj = objectMapper.readTree(block)
                val name = obj.get("name")?.takeIf { it.isTextual }?.asText()
                    ?: obj.get("tool")?.takeIf { it.isTextual }?.asText()
                if (name != null) add(name, obj.get("arguments") ?: obj.get("parameters"))
            }
            i = text.indexOf('{', i + 1)
        }
        return calls
    }

    private fun resolveModel(baseUrl: String, auth: ProviderAuthResolver.ProviderAuth, configuredModel: String): String =
        try {
            val models = fetchAvailableModels(baseUrl, auth)
            when {
                models.isEmpty() -> configuredModel
                models.size == 1 -> models.first()
                else -> models.firstOrNull { it == configuredModel } ?: models.first()
            }
        } catch (ex: Exception) {
            logger.debug("Descoberta de modelo falhou, seguindo com o configurado: {}", ex.message)
            configuredModel
        }

    private fun fetchAvailableModels(baseUrl: String, auth: ProviderAuthResolver.ProviderAuth): List<String> {
        val url = "$baseUrl/models${auth.querySuffix}"
        val requestBuilder = HttpRequest.newBuilder(URI.create(url)).GET()
        auth.headers.forEach { (key, value) -> requestBuilder.header(key, value) }
        val response = httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString())
        if (response.statusCode() !in 200..299) throw IOException("HTTP ${response.statusCode()}")
        val node = objectMapper.readTree(response.body())
        return node.get("data")?.mapNotNull { it.get("id")?.asText() } ?: emptyList()
    }

    private fun classifyHttpFailure(status: Int, detail: String): Pair<String, String> = when {
        status == 401 || status == 403 -> "unauthenticated" to "Endpoint recusou a chave de API (HTTP $status). $detail"
        status == 429 -> "rate_limited" to "Limite de uso do endpoint atingido (HTTP $status). $detail"
        else -> "unknown" to detail.ifBlank { "Endpoint retornou HTTP $status." }
    }

    private fun chatMessage(role: String, content: String): ObjectNode =
        objectMapper.createObjectNode().apply {
            put("role", role)
            put("content", content)
        }

    private fun assistantMessage(content: String, toolCalls: List<ToolCallAccumulator>): ObjectNode =
        objectMapper.createObjectNode().apply {
            put("role", "assistant")
            if (content.isNotEmpty()) put("content", content) else putNull("content")
            val callsArray = objectMapper.createArrayNode()
            toolCalls.forEach { call ->
                callsArray.add(
                    objectMapper.createObjectNode().apply {
                        put("id", call.id)
                        put("type", "function")
                        replace(
                            "function",
                            objectMapper.createObjectNode().apply {
                                put("name", call.name)
                                put("arguments", call.arguments)
                            },
                        )
                    },
                )
            }
            replace("tool_calls", callsArray)
        }

    private fun toolMessage(callId: String, content: String): ObjectNode =
        objectMapper.createObjectNode().apply {
            put("role", "tool")
            put("tool_call_id", callId)
            put("content", content)
        }

    private fun toolPayload(tool: ResolvedTool): Map<String, Any?> = mapOf(
        "type" to "function",
        "function" to mapOf(
            "name" to tool.definition.name,
            "description" to tool.definition.description,
            "parameters" to tool.definition.parameters,
        ),
    )

    private fun emitEvent(emitter: SseEmitter, event: String, data: Any) {
        try {
            emitter.send(SseEmitter.event().name(event).data(data, MediaType.APPLICATION_JSON))
        } catch (ex: IOException) {
            logger.warn("Falha ao escrever evento SSE '{}': cliente provavelmente desconectou", event)
        }
    }

    private fun emitError(emitter: SseEmitter, code: String, message: String) {
        emitEvent(emitter, "error", ErrorEvent(code, message))
        completeEmitter(emitter)
    }

    private fun completeEmitter(emitter: SseEmitter) {
        runCatching { emitter.complete() }
            .onFailure { logger.debug("Emitter já estava concluído: {}", it.message) }
    }
}
