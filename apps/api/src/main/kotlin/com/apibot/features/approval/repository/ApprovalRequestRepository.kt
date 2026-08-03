package com.apibot.features.approval.repository

import com.apibot.features.approval.model.ApprovalRequest
import com.apibot.features.approval.model.ApprovalStatus
import java.util.UUID

interface ApprovalRequestRepository {
    fun save(request: ApprovalRequest): ApprovalRequest
    fun findById(id: UUID): ApprovalRequest?

    /**
     * Leitura com lock de linha, para o read-modify-write de `items` (design D15). `decideItem` reescreve o
     * array jsonb inteiro, então duas decisões concorrentes em itens **diferentes** se sobrescreveriam: o
     * segundo write descartaria o veredito do primeiro, `statusFromItems()` nunca veria a lista completa e o
     * pedido ficaria PENDING para sempre — com o run pausado sem saída. Só é honrado dentro de transação.
     */
    fun findByIdForUpdate(id: UUID): ApprovalRequest?

    fun findAllByRunId(runId: UUID): List<ApprovalRequest>

    /** Aprovações onde `userId` está no snapshot de `approverUserIds` — RF13/"assigned-to-me". */
    fun findAllAssignedTo(userId: UUID, status: ApprovalStatus?): List<ApprovalRequest>
}
