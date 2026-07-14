package com.apibot.features.seat.repository

import com.apibot.features.seat.model.Seat
import java.util.UUID

interface SeatRepository {
    fun save(seat: Seat): Seat
    fun findById(id: UUID): Seat?
    fun findAllBySquadId(squadId: UUID): List<Seat>
    fun update(seat: Seat): Seat
    fun deleteById(id: UUID)
    fun deleteAllBySquadId(squadId: UUID)
}
