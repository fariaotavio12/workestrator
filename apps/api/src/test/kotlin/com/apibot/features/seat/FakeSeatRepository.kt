package com.apibot.features.seat

import com.apibot.features.seat.model.Seat
import com.apibot.features.seat.repository.SeatRepository
import java.util.UUID

class FakeSeatRepository : SeatRepository {
    val stored = mutableMapOf<UUID, Seat>()

    override fun save(seat: Seat): Seat {
        stored[seat.id] = seat
        return seat
    }

    override fun findById(id: UUID): Seat? = stored[id]

    override fun findAllBySquadId(squadId: UUID): List<Seat> =
        stored.values.filter { it.squadId == squadId }

    override fun update(seat: Seat): Seat {
        stored[seat.id] = seat
        return seat
    }

    override fun deleteById(id: UUID) {
        stored.remove(id)
    }

    override fun deleteAllBySquadId(squadId: UUID) {
        stored.values.removeIf { it.squadId == squadId }
    }
}
