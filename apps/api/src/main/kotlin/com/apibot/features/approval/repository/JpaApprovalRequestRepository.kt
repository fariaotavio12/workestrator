package com.apibot.features.approval.repository

import com.apibot.features.approval.model.ApprovalRequestEntity
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface JpaApprovalRequestRepository : JpaRepository<ApprovalRequestEntity, UUID> {
    fun findAllByRunId(runId: UUID): List<ApprovalRequestEntity>

    /**
     * `SELECT ... FOR UPDATE` na linha do pedido — serializa as decisões por item (ver
     * `ApprovalRequestRepository.findByIdForUpdate`). JPQL de propósito, não query nativa: uma nativa
     * devolveria a entidade fora do contexto de persistência gerenciado, e o lock não acompanharia o
     * `save` subsequente.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM ApprovalRequestEntity a WHERE a.id = :id")
    fun findByIdForUpdate(@Param("id") id: UUID): ApprovalRequestEntity?

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
