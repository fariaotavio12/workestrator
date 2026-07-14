package com.apibot.features.squadshare.repository

import com.apibot.features.squadshare.model.SquadShare
import java.util.UUID

interface SquadShareRepository {
    fun save(share: SquadShare): SquadShare
    fun findByToken(token: String): SquadShare?
    fun update(share: SquadShare): SquadShare
}
