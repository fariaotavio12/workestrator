package com.apibot.features.squad.repository

import com.apibot.features.squad.model.SquadEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaSquadRepository : JpaRepository<SquadEntity, UUID> {
    fun findAllByUserId(userId: UUID): List<SquadEntity>
}
