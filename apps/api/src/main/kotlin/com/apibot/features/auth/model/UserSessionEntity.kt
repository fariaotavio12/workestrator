package com.apibot.features.auth.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "user_sessions")
class UserSessionEntity(
    @Id
    val token: String = "",

    @Column(nullable = false)
    val userId: UUID = UUID(0, 0),

    @Column(nullable = false)
    val email: String = "",

    @Column(nullable = false)
    val expiresAt: Instant = Instant.EPOCH,

    @Column(nullable = false, updatable = false)
    val createdAt: Long = System.currentTimeMillis(),
) {
    fun toDomain(): UserSession = UserSession(
        token = this.token,
        userId = this.userId,
        email = this.email,
        expiresAt = this.expiresAt,
    )
}

fun UserSession.toEntity(): UserSessionEntity = UserSessionEntity(
    token = this.token,
    userId = this.userId,
    email = this.email,
    expiresAt = this.expiresAt,
)
