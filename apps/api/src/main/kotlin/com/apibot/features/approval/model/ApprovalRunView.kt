package com.apibot.features.approval.model

import com.apibot.features.agent.model.Agent
import com.apibot.features.approval.dto.ApprovalRunAgentResponse
import com.apibot.features.approval.dto.ApprovalRunResponse
import com.apibot.features.approval.dto.ApprovalRunSquadResponse
import com.apibot.features.run.model.Run
import com.apibot.features.squad.model.Squad
import java.util.UUID

/**
 * O run por trás de um pedido de aprovação, com o mínimo de contexto que torna o transcript legível.
 *
 * `squad` é nulável porque o dono pode ter apagado o squad depois da decisão — o pedido e o run
 * sobrevivem, e uma aprovação já decidida continua abrindo sem eles.
 */
data class ApprovalRunView(
    val approvalId: UUID,
    val run: Run,
    val squad: Squad?,
    val agents: List<Agent>,
)

fun ApprovalRunView.toResponse(): ApprovalRunResponse = ApprovalRunResponse(
    id = this.run.id,
    approvalId = this.approvalId,
    input = this.run.input,
    status = this.run.status,
    startedAt = this.run.startedAt,
    endedAt = this.run.endedAt,
    steps = this.run.steps,
    qaLog = this.run.qaLog,
    runtimeSnapshot = this.run.runtimeSnapshot,
    files = this.run.files,
    squad = this.squad?.let { ApprovalRunSquadResponse(id = it.id, name = it.name, icon = it.icon) },
    agents = this.agents.map {
        ApprovalRunAgentResponse(
            id = it.id,
            name = it.name,
            role = it.role,
            character = it.character,
            accentColor = it.accentColor,
        )
    },
)
