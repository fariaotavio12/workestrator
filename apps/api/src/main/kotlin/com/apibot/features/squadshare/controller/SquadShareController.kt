package com.apibot.features.squadshare.controller

import com.apibot.features.squadshare.dto.AcceptShareResponse
import com.apibot.features.squadshare.dto.SquadSharePreviewResponse
import com.apibot.features.squadshare.dto.SquadShareResponse
import com.apibot.features.squadshare.model.toResponse
import com.apibot.features.squadshare.service.SquadShareService
import com.apibot.security.GetUserId
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@Tag(name = "Squad Share")
class SquadShareController(
    private val squadShareService: SquadShareService,
) {
    @PostMapping("/squads/{id}/share")
    @Operation(summary = "Create a share link for a squad (owner only)")
    @SecurityRequirement(name = "Bearer")
    fun createShare(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<SquadShareResponse> {
        val share = squadShareService.createShare(UUID.fromString(userId), id)
        return ResponseEntity.status(HttpStatus.CREATED).body(share.toResponse())
    }

    @DeleteMapping("/squads/{id}/share/{token}")
    @Operation(summary = "Revoke a share link (owner only)")
    @SecurityRequirement(name = "Bearer")
    fun revokeShare(
        @GetUserId userId: String,
        @PathVariable id: UUID,
        @PathVariable token: String,
    ): ResponseEntity<Void> {
        squadShareService.revokeShare(UUID.fromString(userId), token)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/shares/{token}")
    @Operation(summary = "Public preview of a shared squad — no auth required")
    fun getSharePreview(@PathVariable token: String): ResponseEntity<SquadSharePreviewResponse> =
        ResponseEntity.ok(squadShareService.getPreview(token))

    @PostMapping("/shares/{token}/accept")
    @Operation(summary = "Accept a share, cloning the squad into the authenticated user's account")
    @SecurityRequirement(name = "Bearer")
    fun acceptShare(@GetUserId userId: String, @PathVariable token: String): ResponseEntity<AcceptShareResponse> {
        val result = squadShareService.acceptShare(UUID.fromString(userId), token)
        return ResponseEntity.status(HttpStatus.CREATED).body(result)
    }
}
