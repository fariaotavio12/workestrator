package com.apibot.features.approval.controller

import com.apibot.features.approval.dto.ApprovalResponse
import com.apibot.features.approval.dto.CreateApprovalRequest
import com.apibot.features.approval.dto.DecideApprovalRequest
import com.apibot.features.approval.model.ApprovalStatus
import com.apibot.features.approval.model.toResponse
import com.apibot.features.approval.service.ApprovalService
import com.apibot.features.approval.service.DecideOutcome
import com.apibot.security.GetUserId
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/approvals")
@Tag(name = "Approval")
@SecurityRequirement(name = "Bearer")
class ApprovalController(
    private val service: ApprovalService,
) {
    @PostMapping
    @Operation(summary = "Register a pending checkpoint approval and dispatch its external notification, if configured")
    fun create(
        @GetUserId userId: String,
        @Valid @RequestBody request: CreateApprovalRequest,
    ): ResponseEntity<ApprovalResponse> {
        val ownerId = UUID.fromString(userId)
        val approval = service.create(ownerId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(approval.toResponse(ownerId))
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an approval request — the owner (always) or an assigned approver")
    fun get(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<ApprovalResponse> {
        val requesterId = UUID.fromString(userId)
        return ResponseEntity.ok(service.get(requesterId, id).toResponse(requesterId))
    }

    @GetMapping
    @Operation(summary = "List approval requests of a run")
    fun listByRun(@GetUserId userId: String, @RequestParam runId: UUID): ResponseEntity<List<ApprovalResponse>> {
        val requesterId = UUID.fromString(userId)
        return ResponseEntity.ok(service.listByRun(requesterId, runId).map { it.toResponse(requesterId) })
    }

    @GetMapping("/assigned-to-me")
    @Operation(summary = "List approval requests the authenticated user can decide, as a pool approver")
    fun assignedToMe(
        @GetUserId userId: String,
        @RequestParam(required = false) status: ApprovalStatus?,
    ): ResponseEntity<List<ApprovalResponse>> {
        val requesterId = UUID.fromString(userId)
        return ResponseEntity.ok(service.assignedToMe(requesterId, status).map { it.toResponse(requesterId) })
    }

    @PostMapping("/{id}/decide")
    @Operation(summary = "Approve or reject a pending checkpoint")
    fun decide(
        @GetUserId userId: String,
        @PathVariable id: UUID,
        @Valid @RequestBody request: DecideApprovalRequest,
    ): ResponseEntity<ApprovalResponse> {
        val requesterId = UUID.fromString(userId)
        val outcome = service.decide(requesterId, id, request.approved, request.feedback)
        return when (outcome) {
            // 409 com o corpo da decisão original (design D10) — não um erro genérico. Quem chegou
            // depois (Teams, segunda aba, outro aprovador) precisa saber quem já decidiu.
            is DecideOutcome.AlreadyDecided ->
                ResponseEntity.status(HttpStatus.CONFLICT).body(outcome.request.toResponse(requesterId))
            is DecideOutcome.Applied -> ResponseEntity.ok(outcome.request.toResponse(requesterId))
        }
    }

    @PostMapping("/{id}/items/{itemId}/decide")
    @Operation(summary = "Approve or reject a single item of a checkpoint that reviews a list")
    fun decideItem(
        @GetUserId userId: String,
        @PathVariable id: UUID,
        @PathVariable itemId: UUID,
        @Valid @RequestBody request: DecideApprovalRequest,
    ): ResponseEntity<ApprovalResponse> {
        val requesterId = UUID.fromString(userId)
        val outcome = service.decideItem(requesterId, id, itemId, request.approved, request.feedback)
        return when (outcome) {
            // Mesma regra do `decide`, por item (D10): quem chegou depois recebe 409 com o estado real,
            // para a tela mostrar quem decidiu aquele item em vez de um erro genérico.
            is DecideOutcome.AlreadyDecided ->
                ResponseEntity.status(HttpStatus.CONFLICT).body(outcome.request.toResponse(requesterId))
            is DecideOutcome.Applied -> ResponseEntity.ok(outcome.request.toResponse(requesterId))
        }
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel a pending approval — owner only, even when opted out of deciding")
    fun cancel(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<ApprovalResponse> {
        val requesterId = UUID.fromString(userId)
        return ResponseEntity.ok(service.cancel(requesterId, id).toResponse(requesterId))
    }

    @PostMapping("/{id}/renotify")
    @Operation(summary = "Resend the external notification for a pending approval — owner only")
    fun renotify(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<ApprovalResponse> {
        val requesterId = UUID.fromString(userId)
        return ResponseEntity.ok(service.renotify(requesterId, id).toResponse(requesterId))
    }
}
