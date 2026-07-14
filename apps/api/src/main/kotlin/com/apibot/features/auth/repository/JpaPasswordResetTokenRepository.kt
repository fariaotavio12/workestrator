package com.apibot.features.auth.repository

import com.apibot.features.auth.model.PasswordResetTokenEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaPasswordResetTokenRepository : JpaRepository<PasswordResetTokenEntity, UUID> {
    fun findByToken(token: String): PasswordResetTokenEntity?
    fun findByUserId(userId: UUID): PasswordResetTokenEntity?
    fun deleteByUserId(userId: UUID)
}

