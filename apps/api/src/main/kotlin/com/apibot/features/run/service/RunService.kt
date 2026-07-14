package com.apibot.features.run.service

import com.apibot.features.run.domain.exception.RunAccessDeniedException
import com.apibot.features.run.domain.exception.RunNotFoundException
import com.apibot.features.run.dto.CreateRunRequest
import com.apibot.features.run.dto.UpdateRunRequest
import com.apibot.features.run.model.Run
import com.apibot.features.run.repository.RunRepository
import com.apibot.features.squad.service.SquadService
import com.apibot.shared.extensions.PageRequestParams
import com.apibot.shared.extensions.PageResult
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class RunService(
    private val runRepository: RunRepository,
    private val squadService: SquadService,
) {
    fun createRun(userId: UUID, squadId: UUID, request: CreateRunRequest): Run {
        squadService.getSquadForUser(userId, squadId)

        val run = Run(
            squadId = squadId,
            userId = userId,
            input = request.input,
            status = request.status,
            startedAt = request.startedAt,
            endedAt = request.endedAt,
            steps = request.steps,
            qaLog = request.qaLog,
            resumedFromRunId = request.resumedFromRunId,
            runtimeSnapshot = request.runtimeSnapshot,
        )
        // `files` é opcional no POST (o front preenche depois, no PUT final) — só sobrescreve o default se veio.
        return runRepository.save(if (request.files != null) run.copy(files = request.files) else run)
    }

    fun listRuns(userId: UUID, squadId: UUID): List<Run> {
        squadService.getSquadForUser(userId, squadId)
        return runRepository.findAllBySquadId(squadId)
    }

    fun listRecentRuns(userId: UUID, params: PageRequestParams): PageResult<Run> =
        runRepository.findAllByUserId(userId, params)

    fun getRunForUser(userId: UUID, squadId: UUID, id: UUID): Run {
        val run = runRepository.findById(id) ?: throw RunNotFoundException()
        if (run.squadId != squadId) throw RunNotFoundException()
        if (run.userId != userId) throw RunAccessDeniedException()
        return run
    }

    fun updateRun(userId: UUID, squadId: UUID, id: UUID, request: UpdateRunRequest): Run {
        val current = getRunForUser(userId, squadId, id)
        val updated = current.copy(
            status = request.status ?: current.status,
            endedAt = request.endedAt ?: current.endedAt,
            steps = request.steps ?: current.steps,
            qaLog = request.qaLog ?: current.qaLog,
            runtimeSnapshot = request.runtimeSnapshot ?: current.runtimeSnapshot,
            files = request.files ?: current.files,
        )
        return runRepository.save(updated)
    }
}
