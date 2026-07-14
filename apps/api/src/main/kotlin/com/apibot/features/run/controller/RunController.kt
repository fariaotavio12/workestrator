package com.apibot.features.run.controller

import com.apibot.features.run.dto.CreateRunRequest
import com.apibot.features.run.dto.RunResponse
import com.apibot.features.run.dto.UpdateRunRequest
import com.apibot.features.run.model.toResponse
import com.apibot.features.run.service.RunService
import com.apibot.security.GetUserId
import com.apibot.shared.extensions.PageRequestParams
import com.apibot.shared.extensions.PageResult
import com.apibot.shared.extensions.map
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/runs")
@Tag(name = "Run")
@SecurityRequirement(name = "Bearer")
class RecentRunController(
    private val runService: RunService,
) {
    @GetMapping
    @Operation(summary = "List recent runs of the authenticated user")
    fun listRecentRuns(
        @GetUserId userId: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<PageResult<RunResponse>> {
        val params = PageRequestParams(page, size).normalized(maxSize = 100)
        return ResponseEntity.ok(runService.listRecentRuns(UUID.fromString(userId), params).map { it.toResponse() })
    }
}

@RestController
@RequestMapping("/squads/{squadId}/runs")
@Tag(name = "Run")
@SecurityRequirement(name = "Bearer")
class RunController(
    private val runService: RunService,
) {
    @PostMapping
    @Operation(summary = "Persist a run of a squad")
    fun createRun(
        @GetUserId userId: String,
        @PathVariable squadId: UUID,
        @Valid @RequestBody request: CreateRunRequest,
    ): ResponseEntity<RunResponse> {
        val run = runService.createRun(UUID.fromString(userId), squadId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(run.toResponse())
    }

    @GetMapping
    @Operation(summary = "List runs of a squad")
    fun listRuns(@GetUserId userId: String, @PathVariable squadId: UUID): ResponseEntity<List<RunResponse>> {
        val runs = runService.listRuns(UUID.fromString(userId), squadId)
        return ResponseEntity.ok(runs.map { it.toResponse() })
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a single run of a squad")
    fun getRun(
        @GetUserId userId: String,
        @PathVariable squadId: UUID,
        @PathVariable id: UUID,
    ): ResponseEntity<RunResponse> {
        val run = runService.getRunForUser(UUID.fromString(userId), squadId, id)
        return ResponseEntity.ok(run.toResponse())
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an in-flight or finished run (incremental persistence)")
    fun updateRun(
        @GetUserId userId: String,
        @PathVariable squadId: UUID,
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateRunRequest,
    ): ResponseEntity<RunResponse> {
        val run = runService.updateRun(UUID.fromString(userId), squadId, id, request)
        return ResponseEntity.ok(run.toResponse())
    }
}
