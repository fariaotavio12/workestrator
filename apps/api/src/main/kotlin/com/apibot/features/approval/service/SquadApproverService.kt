package com.apibot.features.approval.service

import com.apibot.features.agent.service.AgentService
import com.apibot.features.approval.domain.exception.ApproverAccountNotFoundException
import com.apibot.features.approval.domain.exception.ApproverRemovalViolatesPolicyException
import com.apibot.features.approval.dto.SquadApproverResponse
import com.apibot.features.approval.model.SquadApprover
import com.apibot.features.approval.repository.SquadApproverRepository
import com.apibot.features.squad.service.SquadService
import com.apibot.features.user.repository.UserRepository
import org.springframework.stereotype.Service
import java.util.UUID

/**
 * Pool de aprovadores de um squad (ver .specs/001-aprovacoes-externas-teams). Só o dono do squad gerencia
 * o pool — reaproveita `squadService.getSquadForUser` para essa checagem em toda operação, em vez de
 * reimplementá-la aqui.
 */
@Service
class SquadApproverService(
    private val repository: SquadApproverRepository,
    private val userRepository: UserRepository,
    private val squadService: SquadService,
    private val agentService: AgentService,
) {
    /** Convite duplicado é no-op (design D4/D10.1) — devolve o vínculo já existente, não um erro. */
    fun invite(userId: UUID, squadId: UUID, email: String): SquadApproverResponse {
        squadService.getSquadForUser(userId, squadId)
        val account = userRepository.findByEmail(email) ?: throw ApproverAccountNotFoundException()

        val existing = repository.findBySquadIdAndApproverUserId(squadId, account.id)
        val approver = existing ?: repository.save(
            SquadApprover(squadId = squadId, ownerUserId = userId, approverUserId = account.id),
        )

        return SquadApproverResponse(
            id = approver.id,
            approverUserId = account.id,
            email = account.email,
            displayName = account.name,
            invitedAt = approver.invitedAt,
        )
    }

    fun list(userId: UUID, squadId: UUID): List<SquadApproverResponse> {
        squadService.getSquadForUser(userId, squadId)
        val approvers = repository.findAllBySquadId(squadId)
        val usersById = userRepository.findAllById(approvers.map { it.approverUserId }).associateBy { it.id }

        return approvers.map { approver ->
            val user = usersById[approver.approverUserId]
            SquadApproverResponse(
                id = approver.id,
                approverUserId = approver.approverUserId,
                email = user?.email.orEmpty(),
                displayName = user?.name.orEmpty(),
                invitedAt = approver.invitedAt,
            )
        }
    }

    /**
     * Bloqueia (não corrige em silêncio, design D13) a remoção que deixaria algum agente com
     * `approvalPolicy.ownerCanDecide == false` e nenhum aprovador restante — ver invariante da spec.
     */
    fun remove(userId: UUID, squadId: UUID, approverUserId: UUID) {
        squadService.getSquadForUser(userId, squadId)
        val approver = repository.findBySquadIdAndApproverUserId(squadId, approverUserId) ?: return

        val strandedAgents = agentService.listAgents(userId, squadId).filter { agent ->
            val policy = agent.approvalPolicy
            policy != null &&
                !policy.ownerCanDecide &&
                policy.approverUserIds.contains(approverUserId) &&
                policy.approverUserIds.size == 1
        }
        if (strandedAgents.isNotEmpty()) {
            val names = strandedAgents.joinToString(", ") { it.name }
            throw ApproverRemovalViolatesPolicyException(
                "Cannot remove this approver — no one would be left able to decide for: $names",
            )
        }

        repository.deleteById(approver.id)
    }
}
