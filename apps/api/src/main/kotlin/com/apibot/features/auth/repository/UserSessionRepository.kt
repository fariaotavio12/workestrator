package com.apibot.features.auth.repository

import com.apibot.features.auth.model.UserSession

interface UserSessionRepository {
    fun save(session: UserSession): UserSession
    fun findByToken(token: String): UserSession?
    fun deleteByToken(token: String)
    fun deleteByUserId(userId: java.util.UUID)
}
