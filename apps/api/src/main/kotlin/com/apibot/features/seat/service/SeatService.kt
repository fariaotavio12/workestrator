package com.apibot.features.seat.service

import com.apibot.features.agent.repository.AgentRepository
import com.apibot.features.seat.domain.exception.InvalidSeatAssignmentException
import com.apibot.features.seat.domain.exception.SeatNotFoundException
import com.apibot.features.seat.dto.CreateSeatRequest
import com.apibot.features.seat.dto.UpdateSeatRequest
import com.apibot.features.seat.model.Seat
import com.apibot.features.seat.repository.SeatRepository
import com.apibot.features.squad.service.SquadService
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class SeatService(
    private val seatRepository: SeatRepository,
    private val agentRepository: AgentRepository,
    private val squadService: SquadService,
) {
    fun createSeat(userId: UUID, squadId: UUID, request: CreateSeatRequest): Seat {
        squadService.getSquadForUser(userId, squadId)
        validateAgent(squadId, request.agentId)

        val seat = Seat(
            squadId = squadId,
            agentId = request.agentId,
            col = request.col,
            row = request.row,
        )
        return seatRepository.save(seat)
    }

    fun listSeats(userId: UUID, squadId: UUID): List<Seat> {
        squadService.getSquadForUser(userId, squadId)
        return seatRepository.findAllBySquadId(squadId)
    }

    fun getSeatForSquad(squadId: UUID, id: UUID): Seat {
        val seat = seatRepository.findById(id) ?: throw SeatNotFoundException()
        if (seat.squadId != squadId) throw SeatNotFoundException()
        return seat
    }

    fun updateSeat(userId: UUID, squadId: UUID, id: UUID, request: UpdateSeatRequest): Seat {
        squadService.getSquadForUser(userId, squadId)
        val current = getSeatForSquad(squadId, id)

        val agentId = if (request.agentIdProvided) request.agentId else current.agentId
        if (request.agentIdProvided) validateAgent(squadId, agentId)

        val updated = current.copy(
            col = request.col ?: current.col,
            row = request.row ?: current.row,
            agentId = agentId,
        )
        return seatRepository.update(updated)
    }

    fun deleteSeat(userId: UUID, squadId: UUID, id: UUID) {
        squadService.getSquadForUser(userId, squadId)
        getSeatForSquad(squadId, id)
        seatRepository.deleteById(id)
    }

    private fun validateAgent(squadId: UUID, agentId: UUID?) {
        if (agentId == null) return
        val agent = agentRepository.findById(agentId) ?: throw InvalidSeatAssignmentException()
        if (agent.squadId != squadId) throw InvalidSeatAssignmentException()
    }
}
