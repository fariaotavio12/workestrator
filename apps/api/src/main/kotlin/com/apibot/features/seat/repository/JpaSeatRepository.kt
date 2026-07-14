package com.apibot.features.seat.repository

import com.apibot.features.seat.model.SeatEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaSeatRepository : JpaRepository<SeatEntity, UUID> {
    fun findAllBySquadId(squadId: UUID): List<SeatEntity>
    fun deleteAllBySquadId(squadId: UUID)
}
