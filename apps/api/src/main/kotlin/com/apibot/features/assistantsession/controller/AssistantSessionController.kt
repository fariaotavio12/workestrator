package com.apibot.features.assistantsession.controller

import com.apibot.features.assistantsession.dto.AssistantSessionResponse
import com.apibot.features.assistantsession.dto.AssistantSessionSummaryResponse
import com.apibot.features.assistantsession.dto.CreateAssistantSessionRequest
import com.apibot.features.assistantsession.dto.SetAssistantSessionGroupRequest
import com.apibot.features.assistantsession.dto.UpdateAssistantSessionRequest
import com.apibot.features.assistantsession.model.toResponse
import com.apibot.features.assistantsession.model.toSummaryResponse
import com.apibot.features.assistantsession.service.AssistantSessionService
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
@RequestMapping("/assistant/sessions")
@Tag(name = "Assistant Session")
@SecurityRequirement(name = "Bearer")
class AssistantSessionController(
    private val assistantSessionService: AssistantSessionService,
) {
    @PostMapping
    @Operation(summary = "Create a new assistant session")
    fun createSession(
        @GetUserId userId: String,
        @Valid @RequestBody request: CreateAssistantSessionRequest,
    ): ResponseEntity<AssistantSessionResponse> {
        val session = assistantSessionService.createSession(UUID.fromString(userId), request)
        return ResponseEntity.status(HttpStatus.CREATED).body(session.toResponse())
    }

    @GetMapping
    @Operation(summary = "List assistant sessions of the authenticated user (summary only)")
    fun listSessions(@GetUserId userId: String): ResponseEntity<List<AssistantSessionSummaryResponse>> {
        val sessions = assistantSessionService.listSessions(UUID.fromString(userId))
        return ResponseEntity.ok(sessions.map { it.toSummaryResponse() })
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an assistant session with its messages")
    fun getSession(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<AssistantSessionResponse> {
        val session = assistantSessionService.getSessionForUser(UUID.fromString(userId), id)
        return ResponseEntity.ok(session.toResponse())
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an assistant session")
    fun updateSession(
        @GetUserId userId: String,
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateAssistantSessionRequest,
    ): ResponseEntity<AssistantSessionResponse> {
        val session = assistantSessionService.updateSession(UUID.fromString(userId), id, request)
        return ResponseEntity.ok(session.toResponse())
    }

    @PutMapping("/{id}/group")
    @Operation(summary = "Move a session into a group (or remove it from any group with null)")
    fun setGroup(
        @GetUserId userId: String,
        @PathVariable id: UUID,
        @RequestBody request: SetAssistantSessionGroupRequest,
    ): ResponseEntity<AssistantSessionResponse> {
        val session = assistantSessionService.setGroup(UUID.fromString(userId), id, request.groupId)
        return ResponseEntity.ok(session.toResponse())
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an assistant session")
    fun deleteSession(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<Void> {
        assistantSessionService.deleteSession(UUID.fromString(userId), id)
        return ResponseEntity.noContent().build()
    }
}
