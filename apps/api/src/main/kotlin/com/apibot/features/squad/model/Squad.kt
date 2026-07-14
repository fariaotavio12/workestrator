package com.apibot.features.squad.model

import com.apibot.features.squad.dto.SquadSummaryResponse
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.ObjectNode
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import java.time.Instant
import java.util.UUID

private val defaultTrigger: JsonNode =
    jacksonObjectMapper().createObjectNode().put("type", "manual") as ObjectNode

data class Squad(
    val id: UUID = UUID.randomUUID(),
    val userId: UUID,
    val name: String,
    val description: String = "",
    val icon: String = "",
    /** Tagged union `{type:"manual"}|{type:"schedule",...}|{type:"onComplete",...}` — opaque passthrough, owned by the frontend contract. */
    val trigger: JsonNode = defaultTrigger,
    val orchSystemPrompt: String = "",
    /** Briefing salvo pelo usuário — pré-carrega o dialog de execução e alimenta o gatilho agendado. */
    val savedBriefing: String? = null,
    val orchProviderId: UUID? = null,
    val orchModel: String? = null,
    val orchMaxSteps: Int = 20,
    val orchUseRunHistory: Boolean = false,
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now(),
)

fun Squad.toSummaryResponse(): SquadSummaryResponse = SquadSummaryResponse(
    id = this.id,
    name = this.name,
    description = this.description,
    icon = this.icon,
    trigger = this.trigger,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
