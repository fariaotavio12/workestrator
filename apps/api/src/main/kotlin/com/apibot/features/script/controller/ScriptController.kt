package com.apibot.features.script.controller

import com.apibot.features.script.dto.CreateScriptRequest
import com.apibot.features.script.dto.ScriptResponse
import com.apibot.features.script.dto.UpdateScriptRequest
import com.apibot.features.script.model.toResponse
import com.apibot.features.script.service.ScriptService
import com.apibot.security.GetUserId
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/scripts")
@Tag(name = "Script")
@SecurityRequirement(name = "Bearer")
class ScriptController(
    private val scriptService: ScriptService,
) {
    @PostMapping
    @Operation(summary = "Create a new script")
    fun createScript(
        @GetUserId userId: String,
        @Valid @RequestBody request: CreateScriptRequest,
    ): ResponseEntity<ScriptResponse> {
        val script = scriptService.createScript(UUID.fromString(userId), request)
        return ResponseEntity.status(HttpStatus.CREATED).body(script.toResponse())
    }

    @GetMapping
    @Operation(summary = "List scripts of the authenticated user")
    fun listScripts(@GetUserId userId: String): ResponseEntity<List<ScriptResponse>> {
        val scripts = scriptService.listScripts(UUID.fromString(userId))
        return ResponseEntity.ok(scripts.map { it.toResponse() })
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a script by ID")
    fun getScript(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<ScriptResponse> {
        val script = scriptService.getScriptForUser(UUID.fromString(userId), id)
        return ResponseEntity.ok(script.toResponse())
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a script")
    fun updateScript(
        @GetUserId userId: String,
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateScriptRequest,
    ): ResponseEntity<ScriptResponse> {
        val script = scriptService.updateScript(UUID.fromString(userId), id, request)
        return ResponseEntity.ok(script.toResponse())
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a script")
    fun deleteScript(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<Void> {
        scriptService.deleteScript(UUID.fromString(userId), id)
        return ResponseEntity.noContent().build()
    }
}
