package com.apibot.features.run.model

import com.apibot.features.run.dto.RunResponse
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.ArrayNode
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import java.time.Instant
import java.util.UUID

enum class RunStatus(@JsonValue val value: String) {
    RUNNING("running"),
    DONE("done"),
    FAILED("failed"),
    ABORTED("aborted"),
    ;

    companion object {
        @JsonCreator
        @JvmStatic
        fun fromValue(value: String): RunStatus =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unknown run status: $value")
    }
}

private val emptyArrayNode: JsonNode = jacksonObjectMapper().createArrayNode() as ArrayNode

data class Run(
    val id: UUID = UUID.randomUUID(),
    val squadId: UUID,
    val userId: UUID,
    val input: String,
    val status: RunStatus = RunStatus.RUNNING,
    val startedAt: Instant = Instant.now(),
    val endedAt: Instant? = null,
    /** `{stepId, artifact}[]` — opaque passthrough, owned by the frontend contract. */
    val steps: JsonNode = emptyArrayNode,
    /** `{seatId, question, answer}[]` — opaque passthrough, owned by the frontend contract. */
    val qaLog: JsonNode = emptyArrayNode,
    /** Id of the run this one was resumed from, if any — lineage for "continue where it left off". */
    val resumedFromRunId: UUID? = null,
    /**
     * `{currentStep, pendingSeatId, pendingCheckpointKind, pendingQuestion}` — opaque passthrough,
     * owned by the frontend contract. Snapshot of the pending runtime state (checkpoint/question),
     * persisted incrementally so a run can be resumed after the app closes mid-execution.
     */
    val runtimeSnapshot: JsonNode? = null,
    /** Safe connection selections captured at run start; contains ids/aliases, never secret values. */
    val authBindingsSnapshot: JsonNode = emptyArrayNode,
    /** `{path, ext, isImage, size}[]` — opaque passthrough, owned by the frontend contract. Arquivos gerados no run. */
    val files: JsonNode = emptyArrayNode,
)

fun Run.toResponse(): RunResponse = RunResponse(
    id = this.id,
    squadId = this.squadId,
    input = this.input,
    status = this.status,
    startedAt = this.startedAt,
    endedAt = this.endedAt,
    steps = this.steps,
    qaLog = this.qaLog,
    resumedFromRunId = this.resumedFromRunId,
    runtimeSnapshot = this.runtimeSnapshot,
    authBindingsSnapshot = this.authBindingsSnapshot,
    files = this.files,
)
