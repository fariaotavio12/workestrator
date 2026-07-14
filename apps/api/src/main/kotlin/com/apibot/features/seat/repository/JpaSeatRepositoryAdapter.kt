package com.apibot.features.seat.repository

import com.apibot.features.seat.model.Seat
import com.apibot.features.seat.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaSeatRepositoryAdapter(
    private val jpaRepository: JpaSeatRepository,
) : SeatRepository {
    override fun save(seat: Seat): Seat =
        jpaRepository.save(seat.toEntity()).toDomain()

    override fun findById(id: UUID): Seat? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun findAllBySquadId(squadId: UUID): List<Seat> =
        jpaRepository.findAllBySquadId(squadId).map { it.toDomain() }

    override fun update(seat: Seat): Seat =
        jpaRepository.save(seat.toEntity()).toDomain()

    override fun deleteById(id: UUID) =
        jpaRepository.deleteById(id)

    override fun deleteAllBySquadId(squadId: UUID) =
        jpaRepository.deleteAllBySquadId(squadId)
}
