package com.apibot.features.seat.model

import com.apibot.features.seat.dto.SeatResponse
import java.util.UUID

data class Seat(
    val id: UUID = UUID.randomUUID(),
    val squadId: UUID,
    val agentId: UUID? = null,
    val col: Int,
    val row: Int,
)

fun Seat.toResponse(): SeatResponse = SeatResponse(
    id = this.id,
    squadId = this.squadId,
    agentId = this.agentId,
    col = this.col,
    row = this.row,
)
