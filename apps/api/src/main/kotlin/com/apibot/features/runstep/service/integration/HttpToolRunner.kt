package com.apibot.features.runstep.service.integration

import com.apibot.features.runstep.dto.RunStepScriptRequest
import com.apibot.features.script.model.ScriptKind
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.ArrayNode
import org.springframework.stereotype.Component
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets
import java.util.UUID

data class OpenAiToolDefinition(val name: String, val description: String, val parameters: Map<String, Any?>)
data class ToolCallResult(val ok: Boolean, val text: String)
data class ResolvedTool(val definition: OpenAiToolDefinition, val execute: (Map<String, Any?>) -> ToolCallResult)

private const val MAX_TOOL_RESULT_CHARS = 8_000

/**
 * Builds callable tools from `http`-kind scripts only — a Kotlin port of `buildHttpTool`/
 * `resolveOpenAiTools` from the Electron runner (`electron/runner/openai-tools.ts`). `mcp`/`connector`
 * scripts are skipped (no MCP client exists in this backend); `command`/`inline`/`file` never applied
 * to API-key providers even in the original implementation, since they require a local shell.
 */
@Component
class HttpToolRunner(
    private val authResolver: ProviderAuthResolver,
    private val httpClient: HttpClient,
    private val objectMapper: ObjectMapper,
) {
    private val placeholderRegex = Regex("""\{\{\s*([\w.-]+)\s*}}""")

    fun resolveTools(userId: UUID, scripts: List<RunStepScriptRequest>): List<ResolvedTool> {
        val taken = mutableSetOf<String>()
        return scripts
            .filter { it.kind == ScriptKind.HTTP && !it.urlTemplate.isNullOrBlank() }
            .map { buildTool(userId, it, taken) }
    }

    private fun buildTool(userId: UUID, script: RunStepScriptRequest, taken: MutableSet<String>): ResolvedTool {
        val urlTemplate = requireNotNull(script.urlTemplate)
        val method = (script.method?.value ?: "GET").uppercase()
        val staticHeaders = script.headers ?: emptyMap()
        val hasAuthorizationHeader = staticHeaders.keys.any { it.equals("Authorization", ignoreCase = true) }
        val resolvedTarget = if (script.authRef != null && !hasAuthorizationHeader) {
            authResolver.resolveToolAuth(userId, script.authRef, ProviderAuthResolver.HttpAuthTarget(staticHeaders, urlTemplate))
        } else {
            ProviderAuthResolver.HttpAuthTarget(staticHeaders, urlTemplate)
        }

        val name = safeToolName(script.name, taken)
        val placeholders = placeholderRegex.findAll(resolvedTarget.url).map { it.groupValues[1] }.distinct().toList()
        val acceptsBody = method != "GET" && method != "DELETE"

        val properties = mutableMapOf<String, Any?>()
        val required = mutableListOf<String>()
        if (placeholders.isNotEmpty()) {
            properties["variables"] = mapOf(
                "type" to "object",
                "description" to "Valores para os placeholders da URL: ${placeholders.joinToString(", ")}.",
                "properties" to placeholders.associateWith { mapOf("type" to "string", "description" to "Valor de {{$it}}.") },
                "required" to placeholders,
            )
            required.add("variables")
        }
        if (acceptsBody) {
            properties["body"] = mapOf("type" to "object", "description" to (script.bodySchema ?: "Corpo JSON da requisição."))
        }

        val description = listOfNotNull(
            script.description?.takeIf { it.isNotBlank() } ?: "Requisição $method para ${resolvedTarget.url.substringBefore("?")}.",
            placeholders.takeIf { it.isNotEmpty() }?.let { "Preencha: ${it.joinToString(", ") { p -> "variables.$p" }}." },
        ).joinToString(" ")

        val definition = OpenAiToolDefinition(
            name = name,
            description = description,
            parameters = mapOf("type" to "object", "properties" to properties, "required" to required),
        )

        return ResolvedTool(definition) { args -> executeHttpTool(method, resolvedTarget, script.responseMap, args) }
    }

    private fun executeHttpTool(
        method: String,
        target: ProviderAuthResolver.HttpAuthTarget,
        responseMap: String?,
        args: Map<String, Any?>,
    ): ToolCallResult {
        @Suppress("UNCHECKED_CAST")
        val variables = (args["variables"] as? Map<String, Any?>) ?: emptyMap()
        val url = applyUrlTemplate(target.url, variables)
        val acceptsBody = method != "GET" && method != "DELETE"
        val bodyValue = args["body"]

        return try {
            val bodyPublisher = if (acceptsBody && bodyValue != null) {
                HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(bodyValue))
            } else {
                HttpRequest.BodyPublishers.noBody()
            }
            val requestBuilder = HttpRequest.newBuilder(URI.create(url))
                .header("Content-Type", "application/json")
            target.headers.forEach { (key, value) -> requestBuilder.header(key, value) }
            requestBuilder.method(method, bodyPublisher)

            val response = httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString())
            val raw = response.body() ?: ""
            val parsedNode = runCatching { objectMapper.readTree(raw) }.getOrNull()

            if (response.statusCode() !in 200..299) {
                val detail = parsedNode?.toString() ?: raw
                return ToolCallResult(false, truncate("HTTP ${response.statusCode()}: $detail"))
            }
            if (parsedNode == null) return ToolCallResult(true, truncate(raw))

            val mapped = extractPath(parsedNode, responseMap)
            val text = when {
                mapped == null -> "null"
                mapped.isTextual -> mapped.asText()
                else -> objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(mapped)
            }
            ToolCallResult(true, truncate(text))
        } catch (ex: Exception) {
            ToolCallResult(false, "Falha ao chamar $url: ${ex.message}")
        }
    }

    private fun applyUrlTemplate(template: String, variables: Map<String, Any?>): String =
        placeholderRegex.replace(template) { match ->
            val key = match.groupValues[1]
            variables[key]?.let { URLEncoder.encode(it.toString(), StandardCharsets.UTF_8) } ?: ""
        }

    private fun extractPath(value: JsonNode, dotPath: String?): JsonNode? {
        if (dotPath.isNullOrBlank()) return value
        val keys = dotPath.trim()
            .removePrefix("$")
            .replace(Regex("""\[(\w+)]"""), ".$1")
            .split(".")
            .filter { it.isNotEmpty() }
        var current: JsonNode? = value
        for (key in keys) {
            val index = key.toIntOrNull()
            current = if (current is ArrayNode && index != null) current.get(index) else current?.get(key)
        }
        return current
    }

    private fun truncate(text: String): String =
        if (text.length <= MAX_TOOL_RESULT_CHARS) {
            text
        } else {
            "${text.take(MAX_TOOL_RESULT_CHARS)}\n\n[...truncado: ${text.length - MAX_TOOL_RESULT_CHARS} caracteres omitidos. Use responseMap no script para receber só o campo relevante.]"
        }

    private fun safeToolName(raw: String, taken: MutableSet<String>): String {
        val base = raw.replace(Regex("[^a-zA-Z0-9_-]+"), "_").trim('_').ifBlank { "tool" }.take(64)
        if (taken.add(base)) return base
        var i = 2
        while (true) {
            val suffix = "_$i"
            val candidate = base.take(64 - suffix.length) + suffix
            if (taken.add(candidate)) return candidate
            i++
        }
    }
}
