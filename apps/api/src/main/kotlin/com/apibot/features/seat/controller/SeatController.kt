package com.apibot.features.seat.controller

import com.apibot.features.seat.dto.CreateSeatRequest
import com.apibot.features.seat.dto.SeatResponse
import com.apibot.features.seat.dto.UpdateSeatRequest
import com.apibot.features.seat.model.toResponse
import com.apibot.features.seat.service.SeatService
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
@RequestMapping("/squads/{squadId}/seats")
@Tag(name = "Seat")
@SecurityRequirement(name = "Bearer")
class SeatController(
    private val seatService: SeatService,
) {
    @PostMapping
    @Operation(summary = "Create a seat in a squad's grid")
    fun createSeat(
        @GetUserId userId: String,
        @PathVariable squadId: UUID,
        @Valid @RequestBody request: CreateSeatRequest,
    ): ResponseEntity<SeatResponse> {
        val seat = seatService.createSeat(UUID.fromString(userId), squadId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(seat.toResponse())
    }

    @GetMapping
    @Operation(summary = "List seats of a squad")
    fun listSeats(@GetUserId userId: String, @PathVariable squadId: UUID): ResponseEntity<List<SeatResponse>> {
        val seats = seatService.listSeats(UUID.fromString(userId), squadId)
        return ResponseEntity.ok(seats.map { it.toResponse() })
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a seat (position and/or assigned agent)")
    fun updateSeat(
        @GetUserId userId: String,
        @PathVariable squadId: UUID,
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateSeatRequest,
    ): ResponseEntity<SeatResponse> {
        val seat = seatService.updateSeat(UUID.fromString(userId), squadId, id, request)
        return ResponseEntity.ok(seat.toResponse())
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Remove a seat from a squad")
    fun deleteSeat(
        @GetUserId userId: String,
        @PathVariable squadId: UUID,
        @PathVariable id: UUID,
    ): ResponseEntity<Void> {
        seatService.deleteSeat(UUID.fromString(userId), squadId, id)
        return ResponseEntity.noContent().build()
    }
}
