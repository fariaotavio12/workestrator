package com.apibot.features.seat.dto

import io.swagger.v3.oas.annotations.media.Schema
import java.util.UUID

@Schema(description = "Request to create a seat in a squad's grid")
data class CreateSeatRequest(
    @Schema(description = "Grid column") val col: Int,
    @Schema(description = "Grid row") val row: Int,
    @Schema(description = "Agent seated here, if any") val agentId: UUID? = null,
)

@Schema(description = "Request to update a seat (position and/or assigned agent)")
data class UpdateSeatRequest(
    @Schema(description = "Grid column") val col: Int? = null,
    @Schema(description = "Grid row") val row: Int? = null,
    @Schema(description = "Agent seated here — send null to unassign") val agentId: UUID? = null,
    @Schema(description = "Whether agentId was explicitly sent in the payload") val agentIdProvided: Boolean = false,
)

@Schema(description = "Seat response")
data class SeatResponse(
    @Schema(description = "Seat ID") val id: UUID,
    @Schema(description = "Owning squad ID") val squadId: UUID,
    @Schema(description = "Agent seated here, if any") val agentId: UUID?,
    @Schema(description = "Grid column") val col: Int,
    @Schema(description = "Grid row") val row: Int,
)
