package com.apibot.features.seat.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "seats")
class SeatEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var squadId: UUID,

    @Column(nullable = true)
    var agentId: UUID? = null,

    @Column(nullable = false)
    var col: Int = 0,

    @Column(nullable = false)
    var row: Int = 0,
) {
    fun toDomain(): Seat = Seat(
        id = this.id,
        squadId = this.squadId,
        agentId = this.agentId,
        col = this.col,
        row = this.row,
    )
}

fun Seat.toEntity(): SeatEntity = SeatEntity(
    id = this.id,
    squadId = this.squadId,
    agentId = this.agentId,
    col = this.col,
    row = this.row,
)
