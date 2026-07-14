package com.apibot.features.auth.service

import com.apibot.features.auth.model.UserSession
import com.apibot.features.auth.repository.UserSessionRepository
import org.springframework.stereotype.Service

@Service
class SessionLookupService(
    private val userSessionRepository: UserSessionRepository,
) {
    fun findByToken(token: String): UserSession? {
        val session = userSessionRepository.findByToken(token) ?: return null
        if (session.isExpired()) {
            userSessionRepository.deleteByToken(token)
            return null
        }
        return session
    }

    fun logout(token: String?) {
        if (!token.isNullOrBlank()) {
            userSessionRepository.deleteByToken(token)
        }
    }
}