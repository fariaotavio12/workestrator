package com.apibot.features.approval.model

import java.time.Instant
import java.util.UUID

/**
 * Vínculo de um aprovador ao pool de um squad (ver .specs/001-aprovacoes-externas-teams, "Aprovador
 * delegado"). Só referencia contas já existentes — resolvido por e-mail via `UserRepository.findByEmail`
 * no momento do convite (`SquadApproverService.invite`); nunca cria conta nova.
 */
data class SquadApprover(
    val id: UUID = UUID.randomUUID(),
    val squadId: UUID,
    val ownerUserId: UUID,
    val approverUserId: UUID,
    val invitedAt: Instant = Instant.now(),
)
