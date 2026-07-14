package com.apibot.features.assistantsessiongroup.controller

import com.apibot.features.assistantsessiongroup.dto.AssistantSessionGroupResponse
import com.apibot.features.assistantsessiongroup.dto.CreateAssistantSessionGroupRequest
import com.apibot.features.assistantsessiongroup.dto.UpdateAssistantSessionGroupRequest
import com.apibot.features.assistantsessiongroup.model.toResponse
import com.apibot.features.assistantsessiongroup.service.AssistantSessionGroupService
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
@RequestMapping("/assistant/session-groups")
@Tag(name = "Assistant Session Group")
@SecurityRequirement(name = "Bearer")
class AssistantSessionGroupController(
    private val service: AssistantSessionGroupService,
) {
    @PostMapping
    @Operation(summary = "Create a new assistant session group")
    fun createGroup(
        @GetUserId userId: String,
        @Valid @RequestBody request: CreateAssistantSessionGroupRequest,
    ): ResponseEntity<AssistantSessionGroupResponse> {
        val group = service.createGroup(UUID.fromString(userId), request)
        return ResponseEntity.status(HttpStatus.CREATED).body(group.toResponse())
    }

    @GetMapping
    @Operation(summary = "List assistant session groups of the authenticated user")
    fun listGroups(@GetUserId userId: String): ResponseEntity<List<AssistantSessionGroupResponse>> {
        val groups = service.listGroups(UUID.fromString(userId))
        return ResponseEntity.ok(groups.map { it.toResponse() })
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an assistant session group")
    fun updateGroup(
        @GetUserId userId: String,
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateAssistantSessionGroupRequest,
    ): ResponseEntity<AssistantSessionGroupResponse> {
        val group = service.updateGroup(UUID.fromString(userId), id, request)
        return ResponseEntity.ok(group.toResponse())
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an assistant session group (sessions are ungrouped, not deleted)")
    fun deleteGroup(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<Void> {
        service.deleteGroup(UUID.fromString(userId), id)
        return ResponseEntity.noContent().build()
    }
}
