package com.apibot.features.agent.service

import com.apibot.features.agent.dto.CreateAgentRequest
import com.apibot.features.agent.dto.UpdateAgentRequest
import com.apibot.features.agent.model.Agent
import com.apibot.features.agent.model.AgentApprovalPolicy
import com.apibot.features.agent.repository.AgentRepository
import com.apibot.features.agentpromptversion.model.AgentPromptVersion
import com.apibot.features.agentpromptversion.repository.AgentPromptVersionRepository
import com.apibot.features.approval.domain.exception.InvalidApprovalPolicyException
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
        error("not used by AgentServiceTest")
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
    val store = mutableMapOf<UUID, SquadApprover>()
    override fun save(approver: SquadApprover): SquadApprover {
        store[approver.id] = approver
        return approver
    }
    override fun findById(id: UUID): SquadApprover? = store[id]
    override fun findAllBySquadId(squadId: UUID): List<SquadApprover> = store.values.filter { it.squadId == squadId }
    override fun findBySquadIdAndApproverUserId(squadId: UUID, approverUserId: UUID): SquadApprover? =
        store.values.firstOrNull { it.squadId == squadId && it.approverUserId == approverUserId }
    override fun deleteById(id: UUID) {
        store.remove(id)
    }
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

class AgentServiceTest {
    private val userId = UUID.randomUUID()
    private val squadId = UUID.randomUUID()
    private val approverInPoolId = UUID.randomUUID()
    private val approverOutsidePoolId = UUID.randomUUID()

    private val agentRepository = FakeAgentRepository()
    private val squadRepository = FakeSquadRepository()
    private val squadApproverRepository = FakeSquadApproverRepository()

    private fun buildService(): AgentService {
        squadRepository.save(Squad(id = squadId, userId = userId, name = "Squad de teste"))
        squadApproverRepository.save(SquadApprover(squadId = squadId, ownerUserId = userId, approverUserId = approverInPoolId))

        val squadService = SquadService(
            squadRepository,
            agentRepository,
            FakeSeatRepository(),
            FakeRunRepository(),
            ScriptService(FakeScriptRepository()),
        )
        return AgentService(
            agentRepository,
            FakeSeatRepository(),
            squadService,
            squadApproverRepository,
            FakeAgentPromptVersionRepository(),
        )
    }

    private fun createRequest(policy: AgentApprovalPolicy?) = CreateAgentRequest(
        name = "Beto",
        approvalPolicy = policy,
    )

    @Test
    fun `saving with ownerCanDecide false and no approvers is rejected`() {
        val service = buildService()

        assertThrows(InvalidApprovalPolicyException::class.java) {
            service.createAgent(userId, squadId, createRequest(AgentApprovalPolicy(ownerCanDecide = false)))
        }
    }

    @Test
    fun `saving with an approver id outside the squad's pool is rejected`() {
        val service = buildService()
        val policy = AgentApprovalPolicy(approverUserIds = listOf(approverOutsidePoolId), ownerCanDecide = true)

        assertThrows(InvalidApprovalPolicyException::class.java) {
            service.createAgent(userId, squadId, createRequest(policy))
        }
    }

    @Test
    fun `saving with ownerCanDecide false and a pool approver succeeds`() {
        val service = buildService()
        val policy = AgentApprovalPolicy(approverUserIds = listOf(approverInPoolId), ownerCanDecide = false)

        val agent = service.createAgent(userId, squadId, createRequest(policy))

        assertTrue(agent.approvalPolicy?.approverUserIds == listOf(approverInPoolId))
    }

    @Test
    fun `updateAgent re-validates the policy even when only other fields change`() {
        val service = buildService()
        val agent = service.createAgent(
            userId,
            squadId,
            createRequest(AgentApprovalPolicy(approverUserIds = listOf(approverInPoolId), ownerCanDecide = false)),
        )
        squadApproverRepository.deleteById(
            squadApproverRepository.findBySquadIdAndApproverUserId(squadId, approverInPoolId)!!.id,
        )

        assertThrows(InvalidApprovalPolicyException::class.java) {
            service.updateAgent(
                userId,
                squadId,
                agent.id,
                UpdateAgentRequest(name = "Beto v2"),
            )
        }
    }

    @Test
    fun `agent with no approval policy at all is left untouched (legacy behavior)`() {
        val service = buildService()

        val agent = service.createAgent(userId, squadId, createRequest(policy = null))

        assertTrue(agent.approvalPolicy == null)
    }
}
