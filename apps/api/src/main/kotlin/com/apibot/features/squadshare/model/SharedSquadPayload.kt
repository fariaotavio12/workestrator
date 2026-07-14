package com.apibot.features.squadshare.model

import com.apibot.features.script.model.ConnectorProvider
import com.apibot.features.script.model.McpTransport
import com.apibot.features.script.model.ScriptHttpMethod
import com.apibot.features.script.model.ScriptKind

/**
 * Snapshot sanitizado de um squad, pronto para ser compartilhado por link: nunca carrega
 * `providerId`/`model` do orquestrador ou dos agents, `authRef` dos scripts, nem
 * `knowledgeCollectionIds` — só o dono tem acesso a credenciais e bases de conhecimento.
 * `localId` (em scripts/agents) e `scriptLocalIds`/`agentLocalId` existem só dentro do payload,
 * para reconstruir as referências (agent -> script, seat -> agent) ao importar em outra conta,
 * já que os ids reais mudam a cada import.
 */
data class SharedSquadPayload(
    val version: Int = 1,
    val name: String,
    val description: String,
    val icon: String,
    val orchSystemPrompt: String,
    val orchMaxSteps: Int,
    val scripts: List<SharedScript> = emptyList(),
    val agents: List<SharedAgent> = emptyList(),
    val seats: List<SharedSeat> = emptyList(),
)

data class SharedScript(
    val localId: String,
    val name: String,
    val description: String? = null,
    val kind: ScriptKind,
    val command: String? = null,
    val args: List<String> = emptyList(),
    val language: String? = null,
    val content: String? = null,
    val path: String? = null,
    val method: ScriptHttpMethod? = null,
    val urlTemplate: String? = null,
    val headers: Map<String, String>? = null,
    val bodySchema: String? = null,
    val responseMap: String? = null,
    val transport: McpTransport? = null,
    val url: String? = null,
    val env: Map<String, String>? = null,
    val toolAllowlist: List<String>? = null,
    val connectorProvider: ConnectorProvider? = null,
    val config: String? = null,
)

data class SharedAgent(
    val localId: String,
    val name: String,
    val role: String,
    val systemPrompt: String,
    val scriptLocalIds: List<String> = emptyList(),
    val canExecute: Boolean,
    val requiresCheckpoint: Boolean,
    val requiresCheckpointAfter: Boolean,
    val character: String,
    val gender: String,
    val accentColor: String,
)

data class SharedSeat(
    val col: Int,
    val row: Int,
    val agentLocalId: String? = null,
)
