package com.apibot.features.squadshare.model

import com.apibot.features.squadshare.dto.SquadShareResponse
import java.time.Instant
import java.util.UUID

data class SquadShare(
    val id: UUID = UUID.randomUUID(),
    /** Token opaco usado na URL pública — nunca o `id`, para não vazar UUIDs sequenciáveis do banco. */
    val token: String,
    val squadId: UUID,
    val ownerUserId: UUID,
    /** Snapshot sanitizado no momento da criação — editar o squad depois não altera links já emitidos. */
    val payload: SharedSquadPayload,
    val revoked: Boolean = false,
    val acceptCount: Int = 0,
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now(),
)

fun SquadShare.toResponse(): SquadShareResponse = SquadShareResponse(
    token = this.token,
    squadId = this.squadId,
    revoked = this.revoked,
    acceptCount = this.acceptCount,
    createdAt = this.createdAt,
)
