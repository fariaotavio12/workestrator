package com.apibot.features.squad.service

import com.apibot.features.agent.model.toResponse
import com.apibot.features.agent.repository.AgentRepository
import com.apibot.features.run.repository.RunRepository
import com.apibot.features.seat.model.toResponse
import com.apibot.features.seat.repository.SeatRepository
import com.apibot.features.squad.domain.exception.SquadAccessDeniedException
import com.apibot.features.squad.domain.exception.SquadNotFoundException
import com.apibot.features.squad.dto.CreateSquadRequest
import com.apibot.features.squad.dto.SquadDetailResponse
import com.apibot.features.squad.dto.UpdateSquadRequest
import com.apibot.features.squad.model.Squad
import com.apibot.features.squad.repository.SquadRepository
import com.fasterxml.jackson.databind.node.ObjectNode
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class SquadService(
    private val squadRepository: SquadRepository,
    private val agentRepository: AgentRepository,
    private val seatRepository: SeatRepository,
    private val runRepository: RunRepository,
) {
    fun createSquad(userId: UUID, request: CreateSquadRequest): Squad {
        val squad = Squad(
            userId = userId,
            name = request.name,
            description = request.description,
            icon = request.icon,
            trigger = request.trigger ?: manualTrigger(),
            orchSystemPrompt = request.orchSystemPrompt,
            orchProviderId = request.orchProviderId,
            orchModel = request.orchModel,
            orchMaxSteps = request.orchMaxSteps,
            orchUseRunHistory = request.orchUseRunHistory,
        )
        return squadRepository.save(squad)
    }

    fun listSquads(userId: UUID): List<Squad> =
        squadRepository.findAllByUserId(userId)

    fun getSquadForUser(userId: UUID, id: UUID): Squad {
        val squad = squadRepository.findById(id) ?: throw SquadNotFoundException()
        if (squad.userId != userId) throw SquadAccessDeniedException()
        return squad
    }

    fun getSquadDetail(userId: UUID, id: UUID): SquadDetailResponse {
        val squad = getSquadForUser(userId, id)
        val agents = agentRepository.findAllBySquadId(id)
        val seats = seatRepository.findAllBySquadId(id)

        return SquadDetailResponse(
            id = squad.id,
            name = squad.name,
            description = squad.description,
            icon = squad.icon,
            trigger = squad.trigger,
            orchSystemPrompt = squad.orchSystemPrompt,
            savedBriefing = squad.savedBriefing,
            orchProviderId = squad.orchProviderId,
            orchModel = squad.orchModel,
            orchMaxSteps = squad.orchMaxSteps,
            orchUseRunHistory = squad.orchUseRunHistory,
            agents = agents.map { it.toResponse() },
            seats = seats.map { it.toResponse() },
            createdAt = squad.createdAt,
            updatedAt = squad.updatedAt,
        )
    }

    fun updateSquad(userId: UUID, id: UUID, request: UpdateSquadRequest): Squad {
        val current = getSquadForUser(userId, id)
        val updated = current.copy(
            name = request.name ?: current.name,
            description = request.description ?: current.description,
            icon = request.icon ?: current.icon,
            trigger = request.trigger ?: current.trigger,
            orchSystemPrompt = request.orchSystemPrompt ?: current.orchSystemPrompt,
            savedBriefing = request.savedBriefing ?: current.savedBriefing,
            orchProviderId = request.orchProviderId ?: current.orchProviderId,
            orchModel = request.orchModel ?: current.orchModel,
            orchMaxSteps = request.orchMaxSteps ?: current.orchMaxSteps,
            orchUseRunHistory = request.orchUseRunHistory ?: current.orchUseRunHistory,
            updatedAt = Instant.now(),
        )
        return squadRepository.update(updated)
    }

    // Precisa ser transacional: os `deleteAllBySquadId` são delete queries derivadas do Spring Data,
    // que exigem uma transação ativa ("No EntityManager with actual transaction available ... 'remove'").
    // Também torna a remoção do squad + filhos (agents/seats/runs) atômica.
    @Transactional
    fun deleteSquad(userId: UUID, id: UUID) {
        getSquadForUser(userId, id)
        agentRepository.deleteAllBySquadId(id)
        seatRepository.deleteAllBySquadId(id)
        runRepository.deleteAllBySquadId(id)
        squadRepository.deleteById(id)
    }

    private fun manualTrigger() = jacksonObjectMapper().createObjectNode().put("type", "manual") as ObjectNode
}
