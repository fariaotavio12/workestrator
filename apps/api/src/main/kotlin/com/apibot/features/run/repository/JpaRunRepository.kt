package com.apibot.features.run.repository

import com.apibot.features.run.model.RunEntity
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaRunRepository : JpaRepository<RunEntity, UUID> {
    fun findAllBySquadId(squadId: UUID): List<RunEntity>
    fun findAllByUserId(userId: UUID, pageable: Pageable): Page<RunEntity>
    fun deleteAllBySquadId(squadId: UUID)
}
