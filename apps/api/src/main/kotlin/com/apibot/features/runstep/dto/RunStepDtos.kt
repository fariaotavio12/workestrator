package com.apibot.features.runstep.dto

import com.apibot.features.provider.model.ProviderKind
import com.apibot.features.script.model.ConnectorProvider
import com.apibot.features.script.model.McpTransport
import com.apibot.features.script.model.ScriptHttpMethod
import com.apibot.features.script.model.ScriptKind
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank

/**
 * Tool attached to the agent for this step. Only `kind: http` actually executes here — `mcp`/`connector`
 * are accepted for shape parity with the client but silently skipped (no MCP client exists in this
 * backend yet); `command`/`inline`/`file` never applied to API-key providers even in the Electron
 * runner this endpoint replaces (`electron/runner/openai-tools.ts`), since they require a local shell.
 */
@Schema(description = "A tool attached to the agent for this step — only http-kind tools execute for API providers")
data class RunStepScriptRequest(
    @Schema(description = "Script id, echoed back for correlation only") val id: String? = null,
    @Schema(description = "Tool name, exposed to the model as the function name")
    @field:NotBlank(message = "Script name is required")
    val name: String,
    @Schema(description = "Tool description shown to the model") val description: String? = null,
    @Schema(description = "Only HTTP tools execute against API providers; other kinds are ignored") val kind: ScriptKind,
    @Schema(description = "HTTP method for kind=http") val method: ScriptHttpMethod? = null,
    @Schema(description = "URL template with {{placeholders}} for kind=http") val urlTemplate: String? = null,
    @Schema(description = "Static headers for kind=http") val headers: Map<String, String>? = null,
    @Schema(description = "Free-text hint of the expected request body shape") val bodySchema: String? = null,
    @Schema(description = "Dot-path applied to the response before handing it back to the model") val responseMap: String? = null,
    @Schema(description = "MCP transport — stdio scripts are not supported from the web") val transport: McpTransport? = null,
    @Schema(description = "MCP/connector server URL") val url: String? = null,
    @Schema(description = "Connector gateway provider") val connectorProvider: ConnectorProvider? = null,
    @Schema(description = "Reference to a Secret used to authenticate this tool's requests") val authRef: String? = null,
)

/**
 * Executes a single agent turn against an API-key provider and streams the result as SSE — the same
 * contract as `POST /api/run-step` in the Electron runner (`electron/runner/runner.ts`,
 * `handleRunStep`), so `apps/web`'s `model-client.ts` can call either transport interchangeably.
 * CLI providers (claude-cli/codex-cli/gpt-cli) are rejected here — they require a local binary.
 */
@Schema(description = "Execute a single agent turn against an API-key provider and stream the result as SSE")
data class RunStepRequest(
    @Schema(description = "System prompt for the agent") val systemPrompt: String? = null,
    @Schema(description = "User-facing prompt for this step")
    @field:NotBlank(message = "Prompt is required")
    val prompt: String,
    @Schema(description = "Model id to call")
    @field:NotBlank(message = "Model is required")
    val model: String,
    @Schema(description = "Provider kind — only openai/openai-compat execute here; CLI kinds require the desktop app")
    val providerKind: ProviderKind,
    @Schema(description = "Base URL of the OpenAI-compatible endpoint") val baseUrl: String? = null,
    @Schema(description = "Reference to the Secret holding the provider's API key") val apiKeyRef: String? = null,
    @Schema(description = "Whether tool calling is enabled for this step") val canExecute: Boolean = false,
    @Schema(description = "Tools attached to the agent") val scripts: List<RunStepScriptRequest> = emptyList(),
)
