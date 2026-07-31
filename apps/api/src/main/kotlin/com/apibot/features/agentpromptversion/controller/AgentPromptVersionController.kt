package com.apibot.features.agentpromptversion.controller

import com.apibot.features.agentpromptversion.dto.AgentPromptVersionResponse
import com.apibot.features.agentpromptversion.model.toResponse
import com.apibot.features.agentpromptversion.service.AgentPromptVersionService
import com.apibot.security.GetUserId
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/squads/{squadId}/agents/{agentId}/prompt-versions")
@Tag(name = "Agent prompt version")
@SecurityRequirement(name = "Bearer")
class AgentPromptVersionController(
    private val agentPromptVersionService: AgentPromptVersionService,
) {
    @GetMapping
    @Operation(summary = "List previous versions of an agent's system prompt")
    fun listVersions(
        @GetUserId userId: String,
        @PathVariable squadId: UUID,
        @PathVariable agentId: UUID,
    ): ResponseEntity<List<AgentPromptVersionResponse>> {
        val versions = agentPromptVersionService.list(UUID.fromString(userId), squadId, agentId)
        return ResponseEntity.ok(versions.map { it.toResponse() })
    }

    @PostMapping("/{versionId}/revert")
    @Operation(summary = "Restore a previous system prompt, recording the reversion as a new version")
    fun revert(
        @GetUserId userId: String,
        @PathVariable squadId: UUID,
        @PathVariable agentId: UUID,
        @PathVariable versionId: UUID,
    ): ResponseEntity<AgentPromptVersionResponse> {
        val version = agentPromptVersionService.revert(UUID.fromString(userId), squadId, agentId, versionId)
        return ResponseEntity.ok(version.toResponse())
    }
}
