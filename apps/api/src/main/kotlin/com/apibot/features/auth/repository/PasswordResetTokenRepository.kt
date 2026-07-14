package com.apibot.features.auth.repository

import com.apibot.features.auth.model.PasswordResetToken
import java.util.UUID

interface PasswordResetTokenRepository {
    fun findByToken(token: String): PasswordResetToken?
    fun findByUserId(userId: UUID): PasswordResetToken?
    fun deleteByUserId(userId: UUID)
    fun save(token: PasswordResetToken): PasswordResetToken
    fun update(token: PasswordResetToken): PasswordResetToken
}

