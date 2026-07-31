package com.apibot.features.approval.service

import com.apibot.features.agent.dto.CreateAgentRequest
import com.apibot.features.agent.model.Agent
import com.apibot.features.agent.model.AgentApprovalPolicy
import com.apibot.features.agent.repository.AgentRepository
import com.apibot.features.agent.service.AgentService
import com.apibot.features.agentpromptversion.model.AgentPromptVersion
import com.apibot.features.agentpromptversion.repository.AgentPromptVersionRepository
import com.apibot.features.approval.domain.exception.ApproverAccountNotFoundException
import com.apibot.features.approval.domain.exception.ApproverRemovalViolatesPolicyException
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
import com.apibot.features.user.model.User
import com.apibot.features.user.model.UserFilter
import com.apibot.features.user.repository.UserRepository
import com.apibot.shared.extensions.PageRequestParams
import com.apibot.shared.extensions.PageResult
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
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
        error("not used by SquadApproverServiceTest")
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

private class FakePromptVersionRepository : AgentPromptVersionRepository {
    override fun save(version: AgentPromptVersion): AgentPromptVersion = version
    override fun findById(id: UUID): AgentPromptVersion? = null
    override fun findAllByAgentId(agentId: UUID): List<AgentPromptVersion> = emptyList()
    override fun countByAgentId(agentId: UUID): Long = 0
    override fun deleteAllByAgentId(agentId: UUID) {}
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

private class FakeUserRepository : UserRepository {
    val store = mutableMapOf<UUID, User>()
    override fun save(user: User): User {
        store[user.id] = user
        return user
    }
    override fun findById(id: UUID): User? = store[id]
    override fun findByEmail(email: String): User? = store.values.firstOrNull { it.email == email }
    override fun findAll(pageRequest: PageRequestParams, filter: UserFilter): PageResult<User> =
        error("not used by SquadApproverServiceTest")
    override fun findAllById(ids: Collection<UUID>): List<User> = ids.mapNotNull { store[it] }
    override fun update(user: User): User {
        store[user.id] = user
        return user
    }
    override fun deleteById(id: UUID) {
        store.remove(id)
    }
}

class SquadApproverServiceTest {
    private val ownerId = UUID.randomUUID()
    private val squadId = UUID.randomUUID()

    private val squadApproverRepository = FakeSquadApproverRepository()
    private val agentRepository = FakeAgentRepository()
    private val userRepository = FakeUserRepository()
    private val squadRepository = FakeSquadRepository()

    private fun buildService(): SquadApproverService {
        squadRepository.save(Squad(id = squadId, userId = ownerId, name = "Squad de teste"))
        val squadService = SquadService(
            squadRepository,
            agentRepository,
            FakeSeatRepository(),
            FakeRunRepository(),
            ScriptService(FakeScriptRepository()),
        )
        val agentService = AgentService(
            agentRepository,
            FakeSeatRepository(),
            squadService,
            squadApproverRepository,
            FakePromptVersionRepository(),
        )
        return SquadApproverService(squadApproverRepository, userRepository, squadService, agentService)
    }

    @Test
    fun `invite resolves an existing account by email and adds it to the pool`() {
        val service = buildService()
        val account = User(name = "Ana", email = "ana@empresa.com")
        userRepository.save(account)

        val response = service.invite(ownerId, squadId, "ana@empresa.com")

        assertEquals(account.id, response.approverUserId)
        assertEquals(1, squadApproverRepository.findAllBySquadId(squadId).size)
    }

    @Test
    fun `invite with an email that has no Workestrator account throws`() {
        val service = buildService()

        assertThrows(ApproverAccountNotFoundException::class.java) {
            service.invite(ownerId, squadId, "ninguem@empresa.com")
        }
    }

    @Test
    fun `inviting the same email twice is a no-op — returns the existing pool entry`() {
        val service = buildService()
        val account = User(name = "Ana", email = "ana@empresa.com")
        userRepository.save(account)

        val first = service.invite(ownerId, squadId, "ana@empresa.com")
        val second = service.invite(ownerId, squadId, "ana@empresa.com")

        assertEquals(first.id, second.id)
        assertEquals(1, squadApproverRepository.findAllBySquadId(squadId).size)
    }

    @Test
    fun `list resolves approver display info from the user account`() {
        val service = buildService()
        val account = User(name = "Ana", email = "ana@empresa.com")
        userRepository.save(account)
        service.invite(ownerId, squadId, "ana@empresa.com")

        val list = service.list(ownerId, squadId)

        assertEquals(1, list.size)
        assertEquals("Ana", list.first().displayName)
    }

    @Test
    fun `removing the last approver of an ownerCanDecide=false agent is blocked (D13)`() {
        val service = buildService()
        val account = User(name = "Ana", email = "ana@empresa.com")
        userRepository.save(account)
        service.invite(ownerId, squadId, "ana@empresa.com")

        val squadService = SquadService(
            squadRepository,
            agentRepository,
            FakeSeatRepository(),
            FakeRunRepository(),
            ScriptService(FakeScriptRepository()),
        )
        val agentService = AgentService(
            agentRepository,
            FakeSeatRepository(),
            squadService,
            squadApproverRepository,
            FakePromptVersionRepository(),
        )
        agentService.createAgent(
            ownerId,
            squadId,
            CreateAgentRequest(
                name = "Beto",
                approvalPolicy = AgentApprovalPolicy(approverUserIds = listOf(account.id), ownerCanDecide = false),
            ),
        )

        assertThrows(ApproverRemovalViolatesPolicyException::class.java) {
            service.remove(ownerId, squadId, account.id)
        }
        assertEquals(1, squadApproverRepository.findAllBySquadId(squadId).size)
    }

    @Test
    fun `removing an approver that is not the last one able to decide succeeds`() {
        val service = buildService()
        val account = User(name = "Ana", email = "ana@empresa.com")
        userRepository.save(account)
        service.invite(ownerId, squadId, "ana@empresa.com")

        service.remove(ownerId, squadId, account.id)

        assertEquals(0, squadApproverRepository.findAllBySquadId(squadId).size)
    }
}
