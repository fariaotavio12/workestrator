package com.apibot.features.approval.service

import com.apibot.features.agent.model.Agent
import com.apibot.features.agent.model.AgentApprovalPolicy
import com.apibot.features.agent.repository.AgentRepository
import com.apibot.features.approval.config.ApprovalProperties
import com.apibot.features.approval.domain.exception.ApprovalAccessDeniedException
import com.apibot.features.approval.domain.exception.ApprovalItemNotFoundException
import com.apibot.features.approval.domain.exception.ItemizedApprovalRequiresPerItemDecisionException
import com.apibot.features.approval.domain.exception.RejectionRequiresFeedbackException
import com.apibot.features.approval.domain.exception.TooManyApprovalItemsException
import com.apibot.features.approval.dto.CreateApprovalItemRequest
import com.apibot.features.approval.dto.CreateApprovalRequest
import com.apibot.features.approval.model.ApprovalDecidedByRole
import com.apibot.features.approval.model.ApprovalItemStatus
import com.apibot.features.approval.model.ApprovalRequest
import com.apibot.features.approval.model.ApprovalStatus
import com.apibot.features.approval.model.CheckpointKind
import com.apibot.features.approval.model.NotificationChannel
import com.apibot.features.approval.repository.ApprovalRequestRepository
import com.apibot.features.approval.repository.NotificationChannelRepository
import com.apibot.features.approval.service.integration.ApprovalNotificationDispatcher
import com.apibot.features.approval.service.integration.WebhookNotifier
import com.apibot.features.secret.crypto.SecretCipher
import com.apibot.features.secret.crypto.SecretCryptoProperties
import com.apibot.features.secret.model.Secret
import com.apibot.features.secret.repository.SecretRepository
import com.apibot.features.secret.service.SecretService
import com.apibot.features.user.model.User
import com.apibot.features.user.model.UserFilter
import com.apibot.features.user.repository.UserRepository
import com.apibot.shared.extensions.PageRequestParams
import com.apibot.shared.extensions.PageResult
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.Base64
import java.util.UUID

/** In-memory fakes — o projeto so tem `kotlin-test-junit5`, sem lib de mock. */
private class FakeApprovalRequestRepository : ApprovalRequestRepository {
    val store = mutableMapOf<UUID, ApprovalRequest>()
    override fun save(request: ApprovalRequest): ApprovalRequest {
        store[request.id] = request
        return request
    }
    override fun findById(id: UUID): ApprovalRequest? = store[id]

    /** Sem lock a fazer em memória — o que este fake não cobre é justamente a corrida que o lock resolve. */
    override fun findByIdForUpdate(id: UUID): ApprovalRequest? = store[id]

    override fun findAllByRunId(runId: UUID): List<ApprovalRequest> = store.values.filter { it.runId == runId }
    override fun findAllAssignedTo(userId: UUID, status: ApprovalStatus?): List<ApprovalRequest> =
        store.values.filter { it.approverUserIds.contains(userId) && (status == null || it.status == status) }
}

private class ApprovalFakeAgentRepository : AgentRepository {
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

private class FakeNotificationChannelRepository : NotificationChannelRepository {
    override fun save(channel: NotificationChannel): NotificationChannel = channel
    override fun findById(id: UUID): NotificationChannel? = null
    override fun findAllByUserId(userId: UUID): List<NotificationChannel> = emptyList()
    override fun deleteById(id: UUID) {}
}

private class ApprovalFakeUserRepository : UserRepository {
    val store = mutableMapOf<UUID, User>()
    override fun save(user: User): User {
        store[user.id] = user
        return user
    }
    override fun findById(id: UUID): User? = store[id]
    override fun findByEmail(email: String): User? = store.values.firstOrNull { it.email == email }
    override fun findAll(pageRequest: PageRequestParams, filter: UserFilter): PageResult<User> =
        error("not used by ApprovalService")
    override fun findAllById(ids: Collection<UUID>): List<User> = ids.mapNotNull { store[it] }
    override fun update(user: User): User {
        store[user.id] = user
        return user
    }
    override fun deleteById(id: UUID) {
        store.remove(id)
    }
}

private class FakeSecretRepository : SecretRepository {
    override fun save(secret: Secret): Secret = secret
    override fun findById(id: UUID): Secret? = null
    override fun findAllByUserId(userId: UUID): List<Secret> = emptyList()
    override fun deleteById(id: UUID) {}
}

class ApprovalServiceTest {
    private val userId = UUID.randomUUID()
    private val approverId = UUID.randomUUID()
    private val squadId = UUID.randomUUID()
    private val runId = UUID.randomUUID()

    private val approvalRepository = FakeApprovalRequestRepository()
    private val agentRepository = ApprovalFakeAgentRepository()
    private val userRepository = ApprovalFakeUserRepository()
    private val properties = ApprovalProperties()

    private fun buildService(props: ApprovalProperties = properties): ApprovalService {
        val cipher = SecretCipher(SecretCryptoProperties(Base64.getEncoder().encodeToString(ByteArray(32) { 1 })))
        val webhookNotifier = WebhookNotifier(SecretService(FakeSecretRepository(), cipher), props)
        val dispatcher = ApprovalNotificationDispatcher(webhookNotifier, approvalRepository)
        return ApprovalService(
            approvalRepository,
            agentRepository,
            FakeNotificationChannelRepository(),
            dispatcher,
            userRepository,
            props,
        )
    }

    private fun createRequest(
        agentId: UUID? = null,
        items: List<CreateApprovalItemRequest> = emptyList(),
    ) = CreateApprovalRequest(
        squadId = squadId,
        runId = runId,
        seatId = "s1",
        agentId = agentId,
        checkpointKind = CheckpointKind.BEFORE,
        title = "Aprovação necessária",
        summary = "Antes de acionar Beto",
        items = items,
    )

    private fun itemRequests(count: Int): List<CreateApprovalItemRequest> =
        (1..count).map { CreateApprovalItemRequest(ref = "2026-00$it", label = "Solicitante $it") }

    private fun agentWithApprover(ownerCanDecide: Boolean = true): Agent {
        val agent = Agent(
            squadId = squadId,
            userId = userId,
            name = "Beto",
            approvalPolicy = AgentApprovalPolicy(
                approverUserIds = listOf(approverId),
                ownerCanDecide = ownerCanDecide,
            ),
        )
        agentRepository.save(agent)
        return agent
    }

    @Test
    fun `create snapshots the agent's approval policy at creation time`() {
        val service = buildService()
        val agent = Agent(
            squadId = squadId,
            userId = userId,
            name = "Beto",
            approvalPolicy = AgentApprovalPolicy(approverUserIds = listOf(approverId), ownerCanDecide = false),
        )
        agentRepository.save(agent)

        val approval = service.create(userId, createRequest(agentId = agent.id))

        assertEquals(listOf(approverId), approval.approverUserIds)
        assertFalse(approval.ownerCanDecide)
        assertEquals(ApprovalStatus.PENDING, approval.status)
    }

    @Test
    fun `create defaults to owner-can-decide with no approvers when the agent has no policy`() {
        val service = buildService()

        val approval = service.create(userId, createRequest(agentId = null))

        assertTrue(approval.approverUserIds.isEmpty())
        assertTrue(approval.ownerCanDecide)
    }

    @Test
    fun `decide applies the first decision and returns Applied`() {
        val service = buildService()
        val approval = service.create(userId, createRequest())

        val outcome = service.decide(userId, approval.id, approved = true, feedback = null)

        check(outcome is DecideOutcome.Applied)
        assertEquals(ApprovalStatus.APPROVED, outcome.request.status)
        assertEquals(userId, outcome.request.decidedByUserId)
    }

    @Test
    fun `decide on an already-decided request returns AlreadyDecided with the original decision`() {
        val service = buildService()
        val approval = service.create(userId, createRequest())
        service.decide(userId, approval.id, approved = true, feedback = null)

        val second = service.decide(userId, approval.id, approved = false, feedback = "tarde demais")

        check(second is DecideOutcome.AlreadyDecided)
        assertEquals(ApprovalStatus.APPROVED, second.request.status)
    }

    @Test
    fun `rejecting without feedback throws`() {
        val service = buildService()
        val approval = service.create(userId, createRequest())

        assertThrows(RejectionRequiresFeedbackException::class.java) {
            service.decide(userId, approval.id, approved = false, feedback = "   ")
        }
    }

    @Test
    fun `owner who opted out of deciding cannot decide but can still view and cancel`() {
        val service = buildService()
        val agent = Agent(
            squadId = squadId,
            userId = userId,
            name = "Beto",
            approvalPolicy = AgentApprovalPolicy(approverUserIds = listOf(approverId), ownerCanDecide = false),
        )
        agentRepository.save(agent)
        val approval = service.create(userId, createRequest(agentId = agent.id))

        assertThrows(ApprovalAccessDeniedException::class.java) {
            service.decide(userId, approval.id, approved = true, feedback = null)
        }

        val viewed = service.get(userId, approval.id)
        assertEquals(approval.id, viewed.id)

        val canceled = service.cancel(userId, approval.id)
        assertEquals(ApprovalStatus.CANCELED, canceled.status)
    }

    @Test
    fun `an approver in the snapshot can decide and view, but cannot cancel`() {
        val service = buildService()
        val agent = Agent(
            squadId = squadId,
            userId = userId,
            name = "Beto",
            approvalPolicy = AgentApprovalPolicy(approverUserIds = listOf(approverId), ownerCanDecide = true),
        )
        agentRepository.save(agent)
        val approval = service.create(userId, createRequest(agentId = agent.id))

        val viewed = service.get(approverId, approval.id)
        assertEquals(approval.id, viewed.id)

        val outcome = service.decide(approverId, approval.id, approved = true, feedback = null)
        check(outcome is DecideOutcome.Applied)
        assertEquals(com.apibot.features.approval.model.ApprovalDecidedByRole.APPROVER, outcome.request.decidedByRole)
    }

    @Test
    fun `a stranger with no relation to the request cannot view decide or cancel it`() {
        val service = buildService()
        val approval = service.create(userId, createRequest())
        val stranger = UUID.randomUUID()

        assertThrows(ApprovalAccessDeniedException::class.java) { service.get(stranger, approval.id) }
        assertThrows(ApprovalAccessDeniedException::class.java) {
            service.decide(stranger, approval.id, approved = true, feedback = null)
        }
        assertThrows(ApprovalAccessDeniedException::class.java) { service.cancel(stranger, approval.id) }
    }

    @Test
    fun `create snapshots the items as pending, keeping a client-supplied id and generating a missing one`() {
        val service = buildService()
        val clientItemId = UUID.randomUUID()

        val approval = service.create(
            userId,
            createRequest(
                items = listOf(
                    CreateApprovalItemRequest(id = clientItemId, ref = "2026-001", label = "Ana Souza"),
                    CreateApprovalItemRequest(ref = "2026-002", label = "Bruno Lima"),
                ),
            ),
        )

        assertTrue(approval.hasItems)
        assertEquals(ApprovalStatus.PENDING, approval.status)
        assertEquals(2, approval.items.size)
        assertEquals(listOf(ApprovalItemStatus.PENDING, ApprovalItemStatus.PENDING), approval.items.map { it.status })
        assertEquals(clientItemId, approval.items[0].id)
        assertEquals("2026-001", approval.items[0].ref)
        assertEquals("Ana Souza", approval.items[0].label)
        assertNotEquals(clientItemId, approval.items[1].id)
        assertEquals("2026-002", approval.items[1].ref)
        assertTrue(approval.items.all { it.decidedAt == null && it.decidedByUserId == null && it.feedback == null })
    }

    @Test
    fun `create rejects more items than the configured cap`() {
        val service = buildService(ApprovalProperties(itemsMaxCount = 2))

        assertThrows(TooManyApprovalItemsException::class.java) {
            service.create(userId, createRequest(items = itemRequests(3)))
        }
    }

    @Test
    fun `decide on the whole request is refused when it carries items`() {
        val service = buildService()
        val approval = service.create(userId, createRequest(items = itemRequests(2)))

        assertThrows(ItemizedApprovalRequiresPerItemDecisionException::class.java) {
            service.decide(userId, approval.id, approved = true, feedback = null)
        }

        assertEquals(ApprovalStatus.PENDING, service.get(userId, approval.id).status)
    }

    @Test
    fun `decide on a request without items still decides the whole request`() {
        val service = buildService()
        val approval = service.create(userId, createRequest())
        assertFalse(approval.hasItems)

        val outcome = service.decide(userId, approval.id, approved = false, feedback = "fora de escopo")

        check(outcome is DecideOutcome.Applied)
        assertEquals(ApprovalStatus.REJECTED, outcome.request.status)
        assertEquals("fora de escopo", outcome.request.feedback)
        assertEquals(userId, outcome.request.decidedByUserId)
        assertEquals(ApprovalDecidedByRole.OWNER, outcome.request.decidedByRole)
        assertNotNull(outcome.request.decidedAt)
        assertTrue(outcome.request.items.isEmpty())
    }

    @Test
    fun `deciding one of three items leaves the parent pending`() {
        val service = buildService()
        val approval = service.create(userId, createRequest(items = itemRequests(3)))

        val outcome = service.decideItem(userId, approval.id, approval.items[0].id, approved = true, feedback = null)

        check(outcome is DecideOutcome.Applied)
        assertEquals(ApprovalStatus.PENDING, outcome.request.status)
        assertNull(outcome.request.decidedAt)
        assertNull(outcome.request.decidedByUserId)
        assertEquals(
            listOf(ApprovalItemStatus.APPROVED, ApprovalItemStatus.PENDING, ApprovalItemStatus.PENDING),
            outcome.request.items.map { it.status },
        )
        assertNotNull(outcome.request.items[0].decidedAt)
        assertEquals(userId, outcome.request.items[0].decidedByUserId)
    }

    @Test
    fun `deciding the last pending item resolves the parent as approved when at least one item passed`() {
        val service = buildService()
        val approval = service.create(userId, createRequest(items = itemRequests(3)))
        val ids = approval.items.map { it.id }

        service.decideItem(userId, approval.id, ids[0], approved = true, feedback = null)
        service.decideItem(userId, approval.id, ids[1], approved = false, feedback = "duplicado")
        val outcome = service.decideItem(userId, approval.id, ids[2], approved = true, feedback = null)

        check(outcome is DecideOutcome.Applied)
        assertEquals(ApprovalStatus.APPROVED, outcome.request.status)
        assertEquals(userId, outcome.request.decidedByUserId)
        assertEquals(ApprovalDecidedByRole.OWNER, outcome.request.decidedByRole)
        assertNotNull(outcome.request.decidedAt)
        assertNull(outcome.request.feedback)
        assertEquals("duplicado", outcome.request.items[1].feedback)
        assertEquals(ApprovalItemStatus.REJECTED, outcome.request.items[1].status)
    }

    @Test
    fun `deciding the last pending item resolves the parent as rejected only when every item was rejected`() {
        val service = buildService()
        val approval = service.create(userId, createRequest(items = itemRequests(2)))
        val ids = approval.items.map { it.id }

        service.decideItem(userId, approval.id, ids[0], approved = false, feedback = "sem verba")
        val outcome = service.decideItem(userId, approval.id, ids[1], approved = false, feedback = "duplicado")

        check(outcome is DecideOutcome.Applied)
        assertEquals(ApprovalStatus.REJECTED, outcome.request.status)
        assertEquals("2026-001: sem verba | 2026-002: duplicado", outcome.request.feedback)
        assertTrue(outcome.request.items.all { it.status == ApprovalItemStatus.REJECTED })
    }

    @Test
    fun `rejecting an item without feedback throws`() {
        val service = buildService()
        val approval = service.create(userId, createRequest(items = itemRequests(2)))

        assertThrows(RejectionRequiresFeedbackException::class.java) {
            service.decideItem(userId, approval.id, approval.items[0].id, approved = false, feedback = "   ")
        }

        assertEquals(ApprovalItemStatus.PENDING, service.get(userId, approval.id).items[0].status)
    }

    @Test
    fun `deciding an already-decided item returns AlreadyDecided with the first verdict`() {
        val service = buildService()
        val approval = service.create(userId, createRequest(items = itemRequests(2)))
        val itemId = approval.items[0].id
        service.decideItem(userId, approval.id, itemId, approved = true, feedback = null)

        val second = service.decideItem(userId, approval.id, itemId, approved = false, feedback = "mudei de ideia")

        check(second is DecideOutcome.AlreadyDecided)
        val item = second.request.items.first { it.id == itemId }
        assertEquals(ApprovalItemStatus.APPROVED, item.status)
        assertNull(item.feedback)
        assertEquals(ApprovalStatus.PENDING, second.request.status)
    }

    @Test
    fun `deciding an unknown item throws`() {
        val service = buildService()
        val approval = service.create(userId, createRequest(items = itemRequests(2)))

        assertThrows(ApprovalItemNotFoundException::class.java) {
            service.decideItem(userId, approval.id, UUID.randomUUID(), approved = true, feedback = null)
        }
    }

    @Test
    fun `deciding an item honors the snapshot authorization`() {
        val service = buildService()
        val agent = agentWithApprover()
        val approval = service.create(userId, createRequest(agentId = agent.id, items = itemRequests(2)))
        val stranger = UUID.randomUUID()

        assertThrows(ApprovalAccessDeniedException::class.java) {
            service.decideItem(stranger, approval.id, approval.items[0].id, approved = true, feedback = null)
        }

        val outcome = service.decideItem(approverId, approval.id, approval.items[0].id, approved = true, feedback = null)

        check(outcome is DecideOutcome.Applied)
        assertEquals(ApprovalItemStatus.APPROVED, outcome.request.items[0].status)
        assertEquals(approverId, outcome.request.items[0].decidedByUserId)
        assertEquals(ApprovalDecidedByRole.APPROVER, outcome.request.items[0].decidedByRole)
    }
}
