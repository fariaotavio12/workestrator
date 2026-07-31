package com.apibot.features.approval.service

import com.apibot.features.agent.model.Agent
import com.apibot.features.agent.model.AgentApprovalPolicy
import com.apibot.features.agent.repository.AgentRepository
import com.apibot.features.approval.config.ApprovalProperties
import com.apibot.features.approval.domain.exception.ApprovalAccessDeniedException
import com.apibot.features.approval.domain.exception.RejectionRequiresFeedbackException
import com.apibot.features.approval.dto.CreateApprovalRequest
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
    override fun findAllByRunId(runId: UUID): List<ApprovalRequest> = store.values.filter { it.runId == runId }
    override fun findAllAssignedTo(userId: UUID, status: ApprovalStatus?): List<ApprovalRequest> =
        store.values.filter { it.approverUserIds.contains(userId) && (status == null || it.status == status) }
}

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

private class FakeNotificationChannelRepository : NotificationChannelRepository {
    override fun save(channel: NotificationChannel): NotificationChannel = channel
    override fun findById(id: UUID): NotificationChannel? = null
    override fun findAllByUserId(userId: UUID): List<NotificationChannel> = emptyList()
    override fun deleteById(id: UUID) {}
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
    private val agentRepository = FakeAgentRepository()
    private val userRepository = FakeUserRepository()
    private val properties = ApprovalProperties()

    private fun buildService(): ApprovalService {
        val cipher = SecretCipher(SecretCryptoProperties(Base64.getEncoder().encodeToString(ByteArray(32) { 1 })))
        val webhookNotifier = WebhookNotifier(SecretService(FakeSecretRepository(), cipher), properties)
        val dispatcher = ApprovalNotificationDispatcher(webhookNotifier, approvalRepository)
        return ApprovalService(
            approvalRepository,
            agentRepository,
            FakeNotificationChannelRepository(),
            dispatcher,
            userRepository,
            properties,
        )
    }

    private fun createRequest(agentId: UUID? = null) = CreateApprovalRequest(
        squadId = squadId,
        runId = runId,
        seatId = "s1",
        agentId = agentId,
        checkpointKind = CheckpointKind.BEFORE,
        title = "Aprovação necessária",
        summary = "Antes de acionar Beto",
    )

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
}
