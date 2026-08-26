package com.apibot.features.approval.model

import com.apibot.features.agent.model.Agent
import com.apibot.features.approval.dto.ApprovalRunAgentResponse
import com.apibot.features.approval.dto.ApprovalRunResponse
import com.apibot.features.approval.dto.ApprovalRunSquadResponse
import com.apibot.features.run.model.Run
import com.apibot.features.squad.model.Squad
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
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
    steps = this.run.steps.orEmptyArray(),
    qaLog = this.run.qaLog.orEmptyArray(),
    runtimeSnapshot = this.run.runtimeSnapshot,
    files = this.run.files.orEmptyArray(),
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

/**
 * Os campos `jsonb` do run são declarados não-nulos, mas o Hibernate preenche o campo por reflexão e uma
 * linha antiga com `NULL` na coluna (ou um `null` JSON gravado) chega aqui como nulo mesmo assim, sem o
 * Kotlin reclamar. Quem consome esta vista renderiza `steps`/`qaLog`/`files` como lista direto — devolver
 * `null` derruba a tela de decisão inteira, e o aprovador perde até o que ele conseguia fazer antes.
 */
private fun JsonNode?.orEmptyArray(): JsonNode =
    if (this == null || this.isNull) jacksonObjectMapper().createArrayNode() else this
