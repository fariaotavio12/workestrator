package com.apibot.features.agentpromptversion.service

import com.apibot.features.agent.FakeAgentRepository
import com.apibot.features.agent.dto.UpdateAgentRequest
import com.apibot.features.agent.model.Agent
import com.apibot.features.agent.service.AgentService
import com.apibot.features.agentpromptversion.FakeAgentPromptVersionRepository
import com.apibot.features.agentpromptversion.domain.exception.AgentPromptVersionNotFoundException
import com.apibot.features.seat.FakeSeatRepository
import com.apibot.features.squad.service.SquadService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import java.util.UUID

class AgentPromptVersionServiceTest {
    private val agentRepository = FakeAgentRepository()
    private val seatRepository = FakeSeatRepository()
    private val versionRepository = FakeAgentPromptVersionRepository()

    // `SquadService` só é consultado em `createAgent`, que estes testes não exercitam.
    private val agentService = AgentService(
        agentRepository,
        seatRepository,
        mock(SquadService::class.java),
        versionRepository,
    )
    private val service = AgentPromptVersionService(agentService, versionRepository)

    private val userId = UUID.randomUUID()
    private val squadId = UUID.randomUUID()

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
            UpdateAgentRequest(systemPrompt = "Prompt novo.", promptChangeReason = "Reprovação de prazo"),
        )

        val versions = versionRepository.findAllByAgentId(agent.id)
        assertEquals(1, versions.size)
        assertEquals(1, versions.first().version)
        assertEquals("Prompt original.", versions.first().systemPrompt)
        assertEquals("Reprovação de prazo", versions.first().reason)
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

        val versions = versionRepository.findAllByAgentId(agent.id)
        assertEquals(listOf(2, 1), versions.map { it.version })
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
        // A reversão guarda o texto que estava em vigor antes dela — voltar atrás é reversível também.
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
