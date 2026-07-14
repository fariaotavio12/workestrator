package com.apibot.features.auth.model

import java.time.Instant
import java.util.UUID

data class PasswordResetToken(
    val id: UUID = UUID.randomUUID(),
    val userId: UUID,
    val token: String,
    val expiresAt: Instant,
    val usedAt: Instant? = null,
    val createdAt: Instant = Instant.now(),
)

