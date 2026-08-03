package com.apibot.features.approval.model

import com.apibot.shared.extensions.sharedJsonMapper
import com.fasterxml.jackson.databind.JsonNode
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID

/**
 * Trava o round-trip `toEntity()`/`toDomain()` dos itens decidíveis (design D15). `ApprovalItem.decidedAt` é
 * o primeiro `Instant` a passar pelo `sharedJsonMapper`: sem o `JavaTimeModule` registrado lá, o Jackson 2.19
 * lança em vez de degradar e toda decisão por item morre com 500 ao gravar o jsonb.
 */
class ApprovalRequestEntityMappingTest {
    private val decidedAt = Instant.parse("2026-08-03T14:25:36.123Z")
    private val createdAt = Instant.parse("2026-08-03T14:00:00.000Z")
    private val updatedAt = Instant.parse("2026-08-03T14:25:36.123Z")

    private fun itemData(): JsonNode = sharedJsonMapper.readTree(
        """
        {
          "NUM_PROCESS": "2026-000123",
          "SOLICITANTE_NOME": "Ana Souza",
          "EXECUTOR_RESPONSAVEL": { "nome": "Beto", "squad": ["ti", "infra"] },
          "CRITICIDADE": 3,
          "REVISADO": true,
          "OBSERVACAO": null
        }
        """.trimIndent(),
    )

    private fun request(): ApprovalRequest {
        val ownerUserId = UUID.randomUUID()
        val deciderId = UUID.randomUUID()
        return ApprovalRequest(
            ownerUserId = ownerUserId,
            squadId = UUID.randomUUID(),
            runId = UUID.randomUUID(),
            seatId = "s1",
            agentId = UUID.randomUUID(),
            checkpointKind = CheckpointKind.BEFORE,
            status = ApprovalStatus.PENDING,
            title = "Aprovação necessária",
            summary = "2 itens para revisar: 2026-000123 e mais 1.",
            channelId = UUID.randomUUID(),
            notifiedAt = createdAt,
            approverUserIds = listOf(deciderId),
            ownerCanDecide = false,
            items = listOf(
                ApprovalItem(
                    ref = "2026-000123",
                    label = "Ana Souza",
                    data = itemData(),
                    status = ApprovalItemStatus.REJECTED,
                    feedback = "Solicitante não é o gestor da área",
                    decidedByUserId = deciderId,
                    decidedByRole = ApprovalDecidedByRole.APPROVER,
                    decidedAt = decidedAt,
                ),
                ApprovalItem(ref = "2026-000124", label = "Bruno Lima"),
            ),
            createdAt = createdAt,
            updatedAt = updatedAt,
        )
    }

    @Test
    fun `toEntity then toDomain is lossless for a request carrying a decided item`() {
        val original = request()

        val roundTripped = original.toEntity().toDomain()

        assertEquals(original, roundTripped)
        assertEquals(original.items, roundTripped.items)
        assertEquals(original.approverUserIds, roundTripped.approverUserIds)
    }

    @Test
    fun `the decided item survives the jsonb round-trip with its Instant intact`() {
        val original = request()

        val item = original.toEntity().toDomain().items.first()

        assertEquals(decidedAt, item.decidedAt)
        assertEquals(ApprovalItemStatus.REJECTED, item.status)
        assertEquals(ApprovalDecidedByRole.APPROVER, item.decidedByRole)
        assertEquals(original.items.first().decidedByUserId, item.decidedByUserId)
        assertEquals("Solicitante não é o gestor da área", item.feedback)
        assertEquals(original.items.first().id, item.id)
        assertEquals("2026-000123", item.ref)
    }

    @Test
    fun `the passthrough item data survives verbatim, nested values included`() {
        val original = request()

        val item = original.toEntity().toDomain().items.first()

        assertEquals(itemData(), item.data)
        assertEquals("Beto", item.data.get("EXECUTOR_RESPONSAVEL").get("nome").asText())
        assertEquals("infra", item.data.get("EXECUTOR_RESPONSAVEL").get("squad").get(1).asText())
        assertEquals(3, item.data.get("CRITICIDADE").asInt())
    }

    @Test
    fun `a still-pending item round-trips with no decision fields`() {
        val original = request()

        val item = original.toEntity().toDomain().items[1]

        assertEquals(ApprovalItemStatus.PENDING, item.status)
        assertNull(item.decidedAt)
        assertNull(item.decidedByUserId)
        assertNull(item.decidedByRole)
        assertNull(item.feedback)
        assertEquals("2026-000124", item.ref)
    }
}
