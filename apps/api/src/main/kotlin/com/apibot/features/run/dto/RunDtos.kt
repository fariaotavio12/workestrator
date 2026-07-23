package com.apibot.features.run.dto

import com.apibot.features.run.model.RunStatus
import com.fasterxml.jackson.databind.JsonNode
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.util.UUID

@Schema(description = "Request to persist a run of a squad")
data class CreateRunRequest(
    @Schema(description = "Input given to the orchestrator") @field:NotBlank(message = "Input is required") val input: String,
    @Schema(description = "Run status") val status: RunStatus,
    @Schema(description = "When the run started") val startedAt: Instant,
    @Schema(description = "When the run ended, if it has") val endedAt: Instant? = null,
    @Schema(description = "Steps executed and their artifacts") val steps: JsonNode,
    @Schema(description = "Questions asked and answers given during the run") val qaLog: JsonNode,
    @Schema(description = "Id of the run this one was resumed from, if any") val resumedFromRunId: UUID? = null,
    @Schema(description = "Snapshot of pending checkpoint/question state, for resuming after a crash") val runtimeSnapshot: JsonNode? = null,
    @Schema(description = "Safe authentication binding selections captured at run start") val authBindingsSnapshot: JsonNode? = null,
    @Schema(description = "Files generated/changed during the run") val files: JsonNode? = null,
)

@Schema(description = "Request to update an in-flight or finished run")
data class UpdateRunRequest(
    @Schema(description = "Run status") val status: RunStatus? = null,
    @Schema(description = "When the run ended, if it has") val endedAt: Instant? = null,
    @Schema(description = "Steps executed and their artifacts") val steps: JsonNode? = null,
    @Schema(description = "Questions asked and answers given during the run") val qaLog: JsonNode? = null,
    @Schema(description = "Snapshot of pending checkpoint/question state, for resuming after a crash") val runtimeSnapshot: JsonNode? = null,
    @Schema(description = "Safe authentication binding selections captured at run start") val authBindingsSnapshot: JsonNode? = null,
    @Schema(description = "Files generated/changed during the run") val files: JsonNode? = null,
)

@Schema(description = "Run response")
data class RunResponse(
    @Schema(description = "Run ID") val id: UUID,
    @Schema(description = "Owning squad ID") val squadId: UUID,
    @Schema(description = "Input given to the orchestrator") val input: String,
    @Schema(description = "Run status") val status: RunStatus,
    @Schema(description = "When the run started") val startedAt: Instant,
    @Schema(description = "When the run ended, if it has") val endedAt: Instant?,
    @Schema(description = "Steps executed and their artifacts") val steps: JsonNode,
    @Schema(description = "Questions asked and answers given during the run") val qaLog: JsonNode,
    @Schema(description = "Id of the run this one was resumed from, if any") val resumedFromRunId: UUID?,
    @Schema(description = "Snapshot of pending checkpoint/question state, for resuming after a crash") val runtimeSnapshot: JsonNode?,
    @Schema(description = "Safe authentication binding selections captured at run start") val authBindingsSnapshot: JsonNode,
    @Schema(description = "Files generated/changed during the run") val files: JsonNode,
)
