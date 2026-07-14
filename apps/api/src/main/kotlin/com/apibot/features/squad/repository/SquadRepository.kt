package com.apibot.features.squad.repository

import com.apibot.features.squad.model.Squad
import java.util.UUID

interface SquadRepository {
    fun save(squad: Squad): Squad
    fun findById(id: UUID): Squad?
    fun findAllByUserId(userId: UUID): List<Squad>
    fun update(squad: Squad): Squad
    fun deleteById(id: UUID)
}
