package com.apibot.features.squadshare.repository

import com.apibot.features.squadshare.model.SquadShareEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaSquadShareRepository : JpaRepository<SquadShareEntity, UUID> {
    fun findByToken(token: String): SquadShareEntity?
}
