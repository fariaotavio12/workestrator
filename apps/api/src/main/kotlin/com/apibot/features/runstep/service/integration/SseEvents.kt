package com.apibot.features.runstep.service.integration

/**
 * SSE event payloads written to the client during a run-step — byte-for-byte the same shapes the
 * Electron runner emits (`writeSseEvent` in `electron/runner/runner.ts`) and that `model-client.ts`'s
 * `callAgentStep` already parses, so the frontend needs no branching between the two transports.
 */
data class ChunkEvent(val text: String)
data class ThinkingEvent(val text: String)
data class ToolUseEvent(val id: String?, val name: String?, val label: String, val detail: String?)
data class ToolResultEvent(val id: String?, val ok: Boolean, val label: String, val detail: String?)
data class DoneEvent(val output: String, val usedFallbackModel: Boolean = false)
data class ErrorEvent(val code: String, val message: String)
