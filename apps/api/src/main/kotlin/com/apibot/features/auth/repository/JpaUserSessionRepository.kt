package com.apibot.features.auth.repository

import com.apibot.features.auth.model.UserSessionEntity
import org.springframework.data.jpa.repository.JpaRepository

interface JpaUserSessionRepository : JpaRepository<UserSessionEntity, String> {
    fun deleteAllByUserId(userId: java.util.UUID)
}
