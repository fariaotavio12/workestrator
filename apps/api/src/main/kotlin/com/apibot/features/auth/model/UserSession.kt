package com.apibot.features.auth.model

import java.time.Instant
import java.util.UUID

data class UserSession(
    val token: String,
    val userId: UUID,
    val email: String,
    val expiresAt: Instant,
) {
    fun isExpired(now: Instant = Instant.now()): Boolean = expiresAt.isBefore(now)
}
