package com.apibot.features.script.repository

import com.apibot.features.script.model.ScriptEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaScriptRepository : JpaRepository<ScriptEntity, UUID> {
    fun findAllByUserId(userId: UUID): List<ScriptEntity>
}
