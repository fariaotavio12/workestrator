package com.apibot.features.approval.controller

import com.apibot.features.approval.dto.InviteSquadApproverRequest
import com.apibot.features.approval.dto.SquadApproverResponse
import com.apibot.features.approval.service.SquadApproverService
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
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/squads/{squadId}/approvers")
@Tag(name = "Squad Approver")
@SecurityRequirement(name = "Bearer")
class SquadApproverController(
    private val service: SquadApproverService,
) {
    @PostMapping
    @Operation(summary = "Invite an existing Workestrator account to this squad's approver pool")
    fun invite(
        @GetUserId userId: String,
        @PathVariable squadId: UUID,
        @Valid @RequestBody request: InviteSquadApproverRequest,
    ): ResponseEntity<SquadApproverResponse> {
        val response = service.invite(UUID.fromString(userId), squadId, request.email)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @GetMapping
    @Operation(summary = "List this squad's approver pool")
    fun list(@GetUserId userId: String, @PathVariable squadId: UUID): ResponseEntity<List<SquadApproverResponse>> =
        ResponseEntity.ok(service.list(UUID.fromString(userId), squadId))

    @DeleteMapping("/{approverUserId}")
    @Operation(summary = "Remove an approver from this squad's pool")
    fun remove(
        @GetUserId userId: String,
        @PathVariable squadId: UUID,
        @PathVariable approverUserId: UUID,
    ): ResponseEntity<Void> {
        service.remove(UUID.fromString(userId), squadId, approverUserId)
        return ResponseEntity.noContent().build()
    }
}
