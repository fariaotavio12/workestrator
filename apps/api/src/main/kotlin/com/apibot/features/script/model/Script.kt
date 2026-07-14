package com.apibot.features.script.model

import com.apibot.features.script.dto.ScriptResponse
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue
import java.time.Instant
import java.util.UUID

/**
 * "command" points at an already-installed binary/command (e.g. `npm test`); "inline" stores a
 * script body written by the user; "file" references a file or directory on the machine where the
 * runner executes, read live at execution time instead of a stored snapshot — only providers that
 * run locally (claude-cli) can resolve it. "http" is a declarative request to an arbitrary API;
 * "mcp" references an MCP server (local stdio or remote HTTP) the runner plugs into the Claude CLI;
 * "connector" is a third-party MCP gateway (Composio/Zapier/n8n/youtube).
 */
enum class ScriptKind(@JsonValue val value: String) {
    COMMAND("command"),
    INLINE("inline"),
    FILE("file"),
    HTTP("http"),
    MCP("mcp"),
    CONNECTOR("connector"),
    ;

    companion object {
        @JsonCreator
        @JvmStatic
        fun fromValue(value: String): ScriptKind =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unknown script kind: $value")
    }
}

/** HTTP method for a "http"-kind script's declarative request. */
enum class ScriptHttpMethod(@JsonValue val value: String) {
    GET("GET"),
    POST("POST"),
    PUT("PUT"),
    PATCH("PATCH"),
    DELETE("DELETE"),
    ;

    companion object {
        @JsonCreator
        @JvmStatic
        fun fromValue(value: String): ScriptHttpMethod =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unknown HTTP method: $value")
    }
}

/** Transport for a "mcp"-kind script's server. */
enum class McpTransport(@JsonValue val value: String) {
    STDIO("stdio"),
    HTTP("http"),
    ;

    companion object {
        @JsonCreator
        @JvmStatic
        fun fromValue(value: String): McpTransport =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unknown MCP transport: $value")
    }
}

/** Third-party MCP gateway for a "connector"-kind script. */
enum class ConnectorProvider(@JsonValue val value: String) {
    COMPOSIO("composio"),
    ZAPIER("zapier"),
    N8N("n8n"),
    YOUTUBE("youtube"),
    ;

    companion object {
        @JsonCreator
        @JvmStatic
        fun fromValue(value: String): ConnectorProvider =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unknown connector provider: $value")
    }
}

data class Script(
    val id: UUID = UUID.randomUUID(),
    val userId: UUID,
    val name: String,
    val description: String? = null,
    val kind: ScriptKind,
    val command: String? = null,
    val args: List<String> = emptyList(),
    val language: String? = null,
    val content: String? = null,
    val path: String? = null,
    val method: ScriptHttpMethod? = null,
    val urlTemplate: String? = null,
    val headers: Map<String, String>? = null,
    val bodySchema: String? = null,
    val responseMap: String? = null,
    val transport: McpTransport? = null,
    val url: String? = null,
    val env: Map<String, String>? = null,
    val toolAllowlist: List<String>? = null,
    val connectorProvider: ConnectorProvider? = null,
    val config: String? = null,
    /** Reference to a `Secret` (never the raw value) — used by http/mcp/connector kinds. */
    val authRef: String? = null,
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now(),
)

fun Script.toResponse(): ScriptResponse = ScriptResponse(
    id = this.id,
    name = this.name,
    description = this.description,
    kind = this.kind,
    command = this.command,
    args = this.args,
    language = this.language,
    content = this.content,
    path = this.path,
    method = this.method,
    urlTemplate = this.urlTemplate,
    headers = this.headers,
    bodySchema = this.bodySchema,
    responseMap = this.responseMap,
    transport = this.transport,
    url = this.url,
    env = this.env,
    toolAllowlist = this.toolAllowlist,
    connectorProvider = this.connectorProvider,
    config = this.config,
    authRef = this.authRef,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
