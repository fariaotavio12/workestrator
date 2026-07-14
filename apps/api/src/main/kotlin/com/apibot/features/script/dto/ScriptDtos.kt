package com.apibot.features.script.dto

import com.apibot.features.script.model.ConnectorProvider
import com.apibot.features.script.model.McpTransport
import com.apibot.features.script.model.ScriptHttpMethod
import com.apibot.features.script.model.ScriptKind
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.util.UUID

@Schema(description = "Request to create a new script")
data class CreateScriptRequest(
    @Schema(description = "Script name") @field:NotBlank(message = "Name is required") val name: String,
    @Schema(description = "Optional description") val description: String? = null,
    @Schema(description = "Script kind") val kind: ScriptKind,
    @Schema(description = "Command to run (kind=command, or kind=mcp with transport=stdio)") val command: String? = null,
    @Schema(description = "Command arguments (kind=command, or kind=mcp with transport=stdio)") val args: List<String> = emptyList(),
    @Schema(description = "Script language (kind=inline)") val language: String? = null,
    @Schema(description = "Script body (kind=inline)") val content: String? = null,
    @Schema(description = "Absolute path to a file or directory on the runner machine (kind=file)")
    val path: String? = null,
    @Schema(description = "HTTP method (kind=http)") val method: ScriptHttpMethod? = null,
    @Schema(description = "URL template, accepts {{placeholders}} (kind=http)") val urlTemplate: String? = null,
    @Schema(description = "Request headers (kind=http, or kind=mcp with transport=http)") val headers: Map<String, String>? = null,
    @Schema(description = "Free-form documentation of the expected body (kind=http)") val bodySchema: String? = null,
    @Schema(description = "How to extract the relevant result from the response (kind=http)") val responseMap: String? = null,
    @Schema(description = "MCP transport (kind=mcp)") val transport: McpTransport? = null,
    @Schema(description = "Server URL (kind=mcp with transport=http)") val url: String? = null,
    @Schema(description = "Environment variables passed to the MCP server (kind=mcp)") val env: Map<String, String>? = null,
    @Schema(description = "Whitelist of tool names exposed by the MCP server (kind=mcp)") val toolAllowlist: List<String>? = null,
    @Schema(description = "Third-party MCP gateway (kind=connector)") val connectorProvider: ConnectorProvider? = null,
    @Schema(description = "Free-form config payload (kind=connector)") val config: String? = null,
    @Schema(description = "Reference to a stored secret, never the raw value (kind=http/mcp/connector)")
    val authRef: String? = null,
)

@Schema(description = "Request to update an existing script")
data class UpdateScriptRequest(
    @Schema(description = "Script name") val name: String? = null,
    @Schema(description = "Optional description") val description: String? = null,
    @Schema(description = "Script kind") val kind: ScriptKind? = null,
    @Schema(description = "Command to run (kind=command, or kind=mcp with transport=stdio)") val command: String? = null,
    @Schema(description = "Command arguments (kind=command, or kind=mcp with transport=stdio)") val args: List<String>? = null,
    @Schema(description = "Script language (kind=inline)") val language: String? = null,
    @Schema(description = "Script body (kind=inline)") val content: String? = null,
    @Schema(description = "Absolute path to a file or directory on the runner machine (kind=file)")
    val path: String? = null,
    @Schema(description = "HTTP method (kind=http)") val method: ScriptHttpMethod? = null,
    @Schema(description = "URL template, accepts {{placeholders}} (kind=http)") val urlTemplate: String? = null,
    @Schema(description = "Request headers (kind=http, or kind=mcp with transport=http)") val headers: Map<String, String>? = null,
    @Schema(description = "Free-form documentation of the expected body (kind=http)") val bodySchema: String? = null,
    @Schema(description = "How to extract the relevant result from the response (kind=http)") val responseMap: String? = null,
    @Schema(description = "MCP transport (kind=mcp)") val transport: McpTransport? = null,
    @Schema(description = "Server URL (kind=mcp with transport=http)") val url: String? = null,
    @Schema(description = "Environment variables passed to the MCP server (kind=mcp)") val env: Map<String, String>? = null,
    @Schema(description = "Whitelist of tool names exposed by the MCP server (kind=mcp)") val toolAllowlist: List<String>? = null,
    @Schema(description = "Third-party MCP gateway (kind=connector)") val connectorProvider: ConnectorProvider? = null,
    @Schema(description = "Free-form config payload (kind=connector)") val config: String? = null,
    @Schema(description = "Reference to a stored secret, never the raw value (kind=http/mcp/connector)")
    val authRef: String? = null,
)

@Schema(description = "Script response")
data class ScriptResponse(
    @Schema(description = "Script ID") val id: UUID,
    @Schema(description = "Script name") val name: String,
    @Schema(description = "Optional description") val description: String?,
    @Schema(description = "Script kind") val kind: ScriptKind,
    @Schema(description = "Command to run (kind=command, or kind=mcp with transport=stdio)") val command: String?,
    @Schema(description = "Command arguments (kind=command, or kind=mcp with transport=stdio)") val args: List<String>,
    @Schema(description = "Script language (kind=inline)") val language: String?,
    @Schema(description = "Script body (kind=inline)") val content: String?,
    @Schema(description = "Absolute path to a file or directory on the runner machine (kind=file)")
    val path: String?,
    @Schema(description = "HTTP method (kind=http)") val method: ScriptHttpMethod?,
    @Schema(description = "URL template, accepts {{placeholders}} (kind=http)") val urlTemplate: String?,
    @Schema(description = "Request headers (kind=http, or kind=mcp with transport=http)") val headers: Map<String, String>?,
    @Schema(description = "Free-form documentation of the expected body (kind=http)") val bodySchema: String?,
    @Schema(description = "How to extract the relevant result from the response (kind=http)") val responseMap: String?,
    @Schema(description = "MCP transport (kind=mcp)") val transport: McpTransport?,
    @Schema(description = "Server URL (kind=mcp with transport=http)") val url: String?,
    @Schema(description = "Environment variables passed to the MCP server (kind=mcp)") val env: Map<String, String>?,
    @Schema(description = "Whitelist of tool names exposed by the MCP server (kind=mcp)") val toolAllowlist: List<String>?,
    @Schema(description = "Third-party MCP gateway (kind=connector)") val connectorProvider: ConnectorProvider?,
    @Schema(description = "Free-form config payload (kind=connector)") val config: String?,
    @Schema(description = "Reference to a stored secret, never the raw value (kind=http/mcp/connector)")
    val authRef: String?,
    @Schema(description = "Creation date") val createdAt: Instant,
    @Schema(description = "Last update date") val updatedAt: Instant,
)
