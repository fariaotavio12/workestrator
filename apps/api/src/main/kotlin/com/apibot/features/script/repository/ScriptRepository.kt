package com.apibot.features.script.repository

import com.apibot.features.script.model.Script
import java.util.UUID

interface ScriptRepository {
    fun save(script: Script): Script
    fun findById(id: UUID): Script?
    fun findAllByUserId(userId: UUID): List<Script>
    fun findAllById(ids: Collection<UUID>): List<Script>
    fun update(script: Script): Script
    fun deleteById(id: UUID)
}
