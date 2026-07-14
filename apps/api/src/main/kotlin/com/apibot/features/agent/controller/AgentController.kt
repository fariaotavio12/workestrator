package com.apibot.features.agent.controller

import com.apibot.features.agent.dto.AgentResponse
import com.apibot.features.agent.dto.CreateAgentRequest
import com.apibot.features.agent.dto.UpdateAgentRequest
import com.apibot.features.agent.model.toResponse
import com.apibot.features.agent.service.AgentService
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
@RequestMapping("/squads/{squadId}/agents")
@Tag(name = "Agent")
@SecurityRequirement(name = "Bearer")
class AgentController(
    private val agentService: AgentService,
) {
    @PostMapping
    @Operation(summary = "Add an agent to a squad")
    fun createAgent(
        @GetUserId userId: String,
        @PathVariable squadId: UUID,
        @Valid @RequestBody request: CreateAgentRequest,
    ): ResponseEntity<AgentResponse> {
        val agent = agentService.createAgent(UUID.fromString(userId), squadId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(agent.toResponse())
    }

    @GetMapping
    @Operation(summary = "List agents of a squad")
    fun listAgents(@GetUserId userId: String, @PathVariable squadId: UUID): ResponseEntity<List<AgentResponse>> {
        val agents = agentService.listAgents(UUID.fromString(userId), squadId)
        return ResponseEntity.ok(agents.map { it.toResponse() })
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an agent by ID")
    fun getAgent(
        @GetUserId userId: String,
        @PathVariable squadId: UUID,
        @PathVariable id: UUID,
    ): ResponseEntity<AgentResponse> {
        val agent = agentService.getAgentForUser(UUID.fromString(userId), squadId, id)
        return ResponseEntity.ok(agent.toResponse())
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an agent")
    fun updateAgent(
        @GetUserId userId: String,
        @PathVariable squadId: UUID,
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateAgentRequest,
    ): ResponseEntity<AgentResponse> {
        val agent = agentService.updateAgent(UUID.fromString(userId), squadId, id, request)
        return ResponseEntity.ok(agent.toResponse())
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Remove an agent from a squad")
    fun deleteAgent(
        @GetUserId userId: String,
        @PathVariable squadId: UUID,
        @PathVariable id: UUID,
    ): ResponseEntity<Void> {
        agentService.deleteAgent(UUID.fromString(userId), squadId, id)
        return ResponseEntity.noContent().build()
    }
}
