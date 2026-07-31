package com.apibot.features.approval.repository

import com.apibot.features.approval.model.ApprovalRequestEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface JpaApprovalRequestRepository : JpaRepository<ApprovalRequestEntity, UUID> {
    fun findAllByRunId(runId: UUID): List<ApprovalRequestEntity>

    /**
     * `approver_user_ids` é um array jsonb de UUIDs-como-texto (serialização default do Jackson para
     * `UUID`). `@>` é o operador de contenção do Postgres para jsonb — testa se o array bate um elemento
     * igual ao construído por `to_jsonb(ARRAY[...])`. Sem isso, "quais pedidos este usuário pode decidir"
     * exigiria escanear e filtrar em memória todos os pedidos do banco.
     */
    @Query(
        value = "SELECT * FROM approval_requests WHERE approver_user_ids @> to_jsonb(ARRAY[CAST(:approverUserId AS text)])",
        nativeQuery = true,
    )
    fun findAllByApproverUserIdInSnapshot(@Param("approverUserId") approverUserId: String): List<ApprovalRequestEntity>
}
