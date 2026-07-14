package com.apibot.features.squad.controller

import com.apibot.features.squad.dto.CreateSquadRequest
import com.apibot.features.squad.dto.SquadDetailResponse
import com.apibot.features.squad.dto.SquadSummaryResponse
import com.apibot.features.squad.dto.UpdateSquadRequest
import com.apibot.features.squad.model.toSummaryResponse
import com.apibot.features.squad.service.SquadService
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
@RequestMapping("/squads")
@Tag(name = "Squad")
@SecurityRequirement(name = "Bearer")
class SquadController(
    private val squadService: SquadService,
) {
    @PostMapping
    @Operation(summary = "Create a new squad")
    fun createSquad(
        @GetUserId userId: String,
        @Valid @RequestBody request: CreateSquadRequest,
    ): ResponseEntity<SquadSummaryResponse> {
        val squad = squadService.createSquad(UUID.fromString(userId), request)
        return ResponseEntity.status(HttpStatus.CREATED).body(squad.toSummaryResponse())
    }

    @GetMapping
    @Operation(summary = "List squads of the authenticated user (summary only)")
    fun listSquads(@GetUserId userId: String): ResponseEntity<List<SquadSummaryResponse>> {
        val squads = squadService.listSquads(UUID.fromString(userId))
        return ResponseEntity.ok(squads.map { it.toSummaryResponse() })
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a squad with its agents and seats")
    fun getSquad(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<SquadDetailResponse> {
        val squad = squadService.getSquadDetail(UUID.fromString(userId), id)
        return ResponseEntity.ok(squad)
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update squad-level fields")
    fun updateSquad(
        @GetUserId userId: String,
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateSquadRequest,
    ): ResponseEntity<SquadSummaryResponse> {
        val squad = squadService.updateSquad(UUID.fromString(userId), id, request)
        return ResponseEntity.ok(squad.toSummaryResponse())
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a squad and its agents, seats and runs")
    fun deleteSquad(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<Void> {
        squadService.deleteSquad(UUID.fromString(userId), id)
        return ResponseEntity.noContent().build()
    }
}
