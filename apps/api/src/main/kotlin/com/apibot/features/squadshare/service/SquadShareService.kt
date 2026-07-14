package com.apibot.features.squadshare.service

import com.apibot.features.agent.model.Agent
import com.apibot.features.agent.repository.AgentRepository
import com.apibot.features.script.model.Script
import com.apibot.features.script.repository.ScriptRepository
import com.apibot.features.seat.model.Seat
import com.apibot.features.seat.repository.SeatRepository
import com.apibot.features.squad.model.Squad
import com.apibot.features.squad.repository.SquadRepository
import com.apibot.features.squad.service.SquadService
import com.apibot.features.squadshare.domain.exception.SquadShareAccessDeniedException
import com.apibot.features.squadshare.domain.exception.SquadShareNotFoundException
import com.apibot.features.squadshare.domain.exception.SquadShareRevokedException
import com.apibot.features.squadshare.dto.AcceptShareResponse
import com.apibot.features.squadshare.dto.SharedAgentPreviewResponse
import com.apibot.features.squadshare.dto.SquadSharePreviewResponse
import com.apibot.features.squadshare.model.SharedAgent
import com.apibot.features.squadshare.model.SharedScript
import com.apibot.features.squadshare.model.SharedSeat
import com.apibot.features.squadshare.model.SharedSquadPayload
import com.apibot.features.squadshare.model.SquadShare
import com.apibot.features.squadshare.repository.SquadShareRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.SecureRandom
import java.time.Instant
import java.util.Base64
import java.util.UUID

@Service
class SquadShareService(
    private val squadShareRepository: SquadShareRepository,
    private val squadRepository: SquadRepository,
    private val squadService: SquadService,
    private val agentRepository: AgentRepository,
    private val seatRepository: SeatRepository,
    private val scriptRepository: ScriptRepository,
) {
    private val secureRandom = SecureRandom()

    fun createShare(userId: UUID, squadId: UUID): SquadShare {
        val squad = squadService.getSquadForUser(userId, squadId)
        val agents = agentRepository.findAllBySquadId(squadId)
        val seats = seatRepository.findAllBySquadId(squadId)

        val scriptIds = agents.flatMap { it.scriptIds }.distinct()
        val scripts = if (scriptIds.isEmpty()) emptyList() else scriptRepository.findAllById(scriptIds)

        val scriptLocalIds = scripts.associate { it.id to UUID.randomUUID().toString() }
        val agentLocalIds = agents.associate { it.id to UUID.randomUUID().toString() }

        val payload = SharedSquadPayload(
            name = squad.name,
            description = squad.description,
            icon = squad.icon,
            orchSystemPrompt = squad.orchSystemPrompt,
            orchMaxSteps = squad.orchMaxSteps,
            scripts = scripts.map { it.toShared(scriptLocalIds.getValue(it.id)) },
            agents = agents.map { it.toShared(agentLocalIds.getValue(it.id), scriptLocalIds) },
            seats = seats.map { it.toShared(agentLocalIds) },
        )

        val share = SquadShare(
            token = generateToken(),
            squadId = squadId,
            ownerUserId = userId,
            payload = payload,
        )
        return squadShareRepository.save(share)
    }

    fun getPreview(token: String): SquadSharePreviewResponse {
        val share = requireActiveShare(token)
        val payload = share.payload
        return SquadSharePreviewResponse(
            name = payload.name,
            description = payload.description,
            icon = payload.icon,
            agentCount = payload.agents.size,
            scriptCount = payload.scripts.size,
            agents = payload.agents.map {
                SharedAgentPreviewResponse(
                    name = it.name,
                    role = it.role,
                    character = it.character,
                    gender = it.gender,
                    accentColor = it.accentColor,
                )
            },
        )
    }

    @Transactional
    fun acceptShare(userId: UUID, token: String): AcceptShareResponse {
        val share = requireActiveShare(token)
        val payload = share.payload

        val newSquad = squadRepository.save(
            Squad(
                userId = userId,
                name = payload.name,
                description = payload.description,
                icon = payload.icon,
                orchSystemPrompt = payload.orchSystemPrompt,
                orchMaxSteps = payload.orchMaxSteps,
            ),
        )

        val scriptIdMap = payload.scripts.associate { shared ->
            shared.localId to scriptRepository.save(shared.toDomain(userId)).id
        }

        val agentIdMap = payload.agents.associate { shared ->
            shared.localId to agentRepository.save(shared.toDomain(newSquad.id, userId, scriptIdMap)).id
        }

        payload.seats.forEach { shared ->
            seatRepository.save(
                Seat(
                    squadId = newSquad.id,
                    agentId = shared.agentLocalId?.let { agentIdMap[it] },
                    col = shared.col,
                    row = shared.row,
                ),
            )
        }

        squadShareRepository.update(share.copy(acceptCount = share.acceptCount + 1, updatedAt = Instant.now()))
        return AcceptShareResponse(squadId = newSquad.id)
    }

    fun revokeShare(userId: UUID, token: String) {
        val share = squadShareRepository.findByToken(token) ?: throw SquadShareNotFoundException()
        if (share.ownerUserId != userId) throw SquadShareAccessDeniedException()
        squadShareRepository.update(share.copy(revoked = true, updatedAt = Instant.now()))
    }

    private fun requireActiveShare(token: String): SquadShare {
        val share = squadShareRepository.findByToken(token) ?: throw SquadShareNotFoundException()
        if (share.revoked) throw SquadShareRevokedException()
        return share
    }

    private fun generateToken(): String {
        val bytes = ByteArray(24)
        secureRandom.nextBytes(bytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    private fun Script.toShared(localId: String): SharedScript = SharedScript(
        localId = localId,
        name = this.name,
        description = this.description,
        kind = this.kind,
        command = this.command,
        args = this.args,
        language = this.language,
        content = this.content,
        path = this.path,
        method = this.method,
        urlTemplate = this.urlTemplate,
        headers = this.headers,
        bodySchema = this.bodySchema,
        responseMap = this.responseMap,
        transport = this.transport,
        url = this.url,
        env = this.env,
        toolAllowlist = this.toolAllowlist,
        connectorProvider = this.connectorProvider,
        config = this.config,
        // `authRef` is deliberately omitted — a share must never carry the owner's credentials.
    )

    private fun Agent.toShared(localId: String, scriptLocalIds: Map<UUID, String>): SharedAgent = SharedAgent(
        localId = localId,
        name = this.name,
        role = this.role,
        systemPrompt = this.systemPrompt,
        scriptLocalIds = this.scriptIds.mapNotNull { scriptLocalIds[it] },
        canExecute = this.canExecute,
        requiresCheckpoint = this.requiresCheckpoint,
        requiresCheckpointAfter = this.requiresCheckpointAfter,
        character = this.character,
        gender = this.gender,
        accentColor = this.accentColor,
        // `providerId`/`model`/`knowledgeCollectionIds` are deliberately omitted — the recipient
        // plugs in their own model and has no access to the owner's knowledge bases.
    )

    private fun Seat.toShared(agentLocalIds: Map<UUID, String>): SharedSeat = SharedSeat(
        col = this.col,
        row = this.row,
        agentLocalId = this.agentId?.let { agentLocalIds[it] },
    )

    private fun SharedScript.toDomain(userId: UUID): Script = Script(
        userId = userId,
        name = this.name,
        description = this.description,
        kind = this.kind,
        command = this.command,
        args = this.args,
        language = this.language,
        content = this.content,
        path = this.path,
        method = this.method,
        urlTemplate = this.urlTemplate,
        headers = this.headers,
        bodySchema = this.bodySchema,
        responseMap = this.responseMap,
        transport = this.transport,
        url = this.url,
        env = this.env,
        toolAllowlist = this.toolAllowlist,
        connectorProvider = this.connectorProvider,
        config = this.config,
        authRef = null,
    )

    private fun SharedAgent.toDomain(squadId: UUID, userId: UUID, scriptIdMap: Map<String, UUID>): Agent = Agent(
        squadId = squadId,
        userId = userId,
        name = this.name,
        role = this.role,
        systemPrompt = this.systemPrompt,
        providerId = null,
        model = null,
        scriptIds = this.scriptLocalIds.mapNotNull { scriptIdMap[it] },
        knowledgeCollectionIds = emptyList(),
        canExecute = this.canExecute,
        requiresCheckpoint = this.requiresCheckpoint,
        requiresCheckpointAfter = this.requiresCheckpointAfter,
        character = this.character,
        gender = this.gender,
        accentColor = this.accentColor,
    )
}
