package com.apibot.features.agentpromptversion.service

import com.apibot.features.agent.dto.UpdateAgentRequest
import com.apibot.features.agent.model.Agent
import com.apibot.features.agent.repository.AgentRepository
import com.apibot.features.agent.service.AgentService
import com.apibot.features.agentpromptversion.domain.exception.AgentPromptVersionNotFoundException
import com.apibot.features.agentpromptversion.model.AgentPromptVersion
import com.apibot.features.agentpromptversion.repository.AgentPromptVersionRepository
import com.apibot.features.approval.model.SquadApprover
import com.apibot.features.approval.repository.SquadApproverRepository
import com.apibot.features.run.model.Run
import com.apibot.features.run.repository.RunRepository
import com.apibot.features.script.model.Script
import com.apibot.features.script.repository.ScriptRepository
import com.apibot.features.script.service.ScriptService
import com.apibot.features.seat.model.Seat
import com.apibot.features.seat.repository.SeatRepository
import com.apibot.features.squad.model.Squad
import com.apibot.features.squad.repository.SquadRepository
import com.apibot.features.squad.service.SquadService
import com.apibot.shared.extensions.PageRequestParams
import com.apibot.shared.extensions.PageResult
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.UUID

/** In-memory fakes — o projeto so tem `kotlin-test-junit5`, sem lib de mock. */
private class FakeAgentRepository : AgentRepository {
    val store = mutableMapOf<UUID, Agent>()
    override fun save(agent: Agent): Agent {
        store[agent.id] = agent
        return agent
    }
    override fun findById(id: UUID): Agent? = store[id]
    override fun findAllBySquadId(squadId: UUID): List<Agent> = store.values.filter { it.squadId == squadId }
    override fun update(agent: Agent): Agent {
        store[agent.id] = agent
        return agent
    }
    override fun deleteById(id: UUID) {
        store.remove(id)
    }
    override fun deleteAllBySquadId(squadId: UUID) {
        store.values.filter { it.squadId == squadId }.forEach { store.remove(it.id) }
    }
}

private class FakeSeatRepository : SeatRepository {
    override fun save(seat: Seat): Seat = seat
    override fun findById(id: UUID): Seat? = null
    override fun findAllBySquadId(squadId: UUID): List<Seat> = emptyList()
    override fun update(seat: Seat): Seat = seat
    override fun deleteById(id: UUID) {}
    override fun deleteAllBySquadId(squadId: UUID) {}
}

private class FakeSquadRepository : SquadRepository {
    val store = mutableMapOf<UUID, Squad>()
    override fun save(squad: Squad): Squad {
        store[squad.id] = squad
        return squad
    }
    override fun findById(id: UUID): Squad? = store[id]
    override fun findAllByUserId(userId: UUID): List<Squad> = store.values.filter { it.userId == userId }
    override fun update(squad: Squad): Squad {
        store[squad.id] = squad
        return squad
    }
    override fun deleteById(id: UUID) {
        store.remove(id)
    }
}

private class FakeRunRepository : RunRepository {
    override fun save(run: Run): Run = run
    override fun findById(id: UUID): Run? = null
    override fun findAllBySquadId(squadId: UUID): List<Run> = emptyList()
    override fun findAllByUserId(userId: UUID, params: PageRequestParams): PageResult<Run> =
        error("not used by AgentPromptVersionServiceTest")
    override fun deleteAllBySquadId(squadId: UUID) {}
}

private class FakeScriptRepository : ScriptRepository {
    override fun save(script: Script): Script = script
    override fun findById(id: UUID): Script? = null
    override fun findAllByUserId(userId: UUID): List<Script> = emptyList()
    override fun findAllById(ids: Collection<UUID>): List<Script> = emptyList()
    override fun update(script: Script): Script = script
    override fun deleteById(id: UUID) {}
}

private class FakeSquadApproverRepository : SquadApproverRepository {
    override fun save(approver: SquadApprover): SquadApprover = approver
    override fun findById(id: UUID): SquadApprover? = null
    override fun findAllBySquadId(squadId: UUID): List<SquadApprover> = emptyList()
    override fun findBySquadIdAndApproverUserId(squadId: UUID, approverUserId: UUID): SquadApprover? = null
    override fun deleteById(id: UUID) {}
}

private class FakeAgentPromptVersionRepository : AgentPromptVersionRepository {
    val store = mutableMapOf<UUID, AgentPromptVersion>()
    override fun save(version: AgentPromptVersion): AgentPromptVersion {
        store[version.id] = version
        return version
    }
    override fun findById(id: UUID): AgentPromptVersion? = store[id]
    override fun findAllByAgentId(agentId: UUID): List<AgentPromptVersion> =
        store.values.filter { it.agentId == agentId }.sortedByDescending { it.version }
    override fun countByAgentId(agentId: UUID): Long = store.values.count { it.agentId == agentId }.toLong()
    override fun deleteAllByAgentId(agentId: UUID) {
        store.values.filter { it.agentId == agentId }.forEach { store.remove(it.id) }
    }
}

class AgentPromptVersionServiceTest {
    private val userId = UUID.randomUUID()
    private val squadId = UUID.randomUUID()

    private val agentRepository = FakeAgentRepository()
    private val squadRepository = FakeSquadRepository()
    private val versionRepository = FakeAgentPromptVersionRepository()

    private val agentService: AgentService = run {
        squadRepository.save(Squad(id = squadId, userId = userId, name = "Squad de teste"))
        val squadService = SquadService(
            squadRepository,
            agentRepository,
            FakeSeatRepository(),
            FakeRunRepository(),
            ScriptService(FakeScriptRepository()),
        )
        AgentService(
            agentRepository,
            FakeSeatRepository(),
            squadService,
            FakeSquadApproverRepository(),
            versionRepository,
        )
    }

    private val service = AgentPromptVersionService(agentService, versionRepository)

    private fun seedAgent(prompt: String = "Prompt original."): Agent {
        val agent = Agent(squadId = squadId, userId = userId, name = "Redator", systemPrompt = prompt)
        agentRepository.save(agent)
        return agent
    }

    @Test
    fun `records the previous prompt when the system prompt changes`() {
        val agent = seedAgent()

        agentService.updateAgent(
            userId,
            squadId,
            agent.id,
            UpdateAgentRequest(systemPrompt = "Prompt novo.", promptChangeReason = "Reprovacao de prazo"),
        )

        val versions = versionRepository.findAllByAgentId(agent.id)
        assertEquals(1, versions.size)
        assertEquals(1, versions.first().version)
        assertEquals("Prompt original.", versions.first().systemPrompt)
        assertEquals("Reprovacao de prazo", versions.first().reason)
        assertEquals("Prompt novo.", agentRepository.findById(agent.id)?.systemPrompt)
    }

    @Test
    fun `does not record a version when the prompt is unchanged`() {
        val agent = seedAgent()

        agentService.updateAgent(userId, squadId, agent.id, UpdateAgentRequest(name = "Outro nome"))
        agentService.updateAgent(userId, squadId, agent.id, UpdateAgentRequest(systemPrompt = "Prompt original."))

        assertTrue(versionRepository.findAllByAgentId(agent.id).isEmpty())
    }

    @Test
    fun `numbers versions sequentially per agent`() {
        val agent = seedAgent()

        agentService.updateAgent(userId, squadId, agent.id, UpdateAgentRequest(systemPrompt = "v2"))
        agentService.updateAgent(userId, squadId, agent.id, UpdateAgentRequest(systemPrompt = "v3"))

        assertEquals(listOf(2, 1), versionRepository.findAllByAgentId(agent.id).map { it.version })
    }

    @Test
    fun `revert restores the exact previous text and records the reversion as a new version`() {
        val agent = seedAgent()
        agentService.updateAgent(userId, squadId, agent.id, UpdateAgentRequest(systemPrompt = "Prompt novo."))
        val firstVersion = versionRepository.findAllByAgentId(agent.id).single()

        service.revert(userId, squadId, agent.id, firstVersion.id)

        assertEquals("Prompt original.", agentRepository.findById(agent.id)?.systemPrompt)
        val versions = versionRepository.findAllByAgentId(agent.id)
        assertEquals(2, versions.size)
        // A reversao guarda o texto que estava em vigor antes dela — voltar atras e reversivel tambem.
        assertEquals("Prompt novo.", versions.first().systemPrompt)
        assertEquals("Revertido para a versão 1.", versions.first().reason)
    }

    @Test
    fun `revert of a version owned by another user is not found`() {
        val agent = seedAgent()
        agentService.updateAgent(userId, squadId, agent.id, UpdateAgentRequest(systemPrompt = "Prompt novo."))
        val version = versionRepository.findAllByAgentId(agent.id).single()
        versionRepository.save(version.copy(userId = UUID.randomUUID()))

        assertThrows(AgentPromptVersionNotFoundException::class.java) {
            service.revert(userId, squadId, agent.id, version.id)
        }
    }

    @Test
    fun `deleting an agent drops its prompt versions`() {
        val agent = seedAgent()
        agentService.updateAgent(userId, squadId, agent.id, UpdateAgentRequest(systemPrompt = "Prompt novo."))

        agentService.deleteAgent(userId, squadId, agent.id)

        assertTrue(versionRepository.findAllByAgentId(agent.id).isEmpty())
        assertNull(agentRepository.findById(agent.id))
    }
}
