package com.apibot.features.auth.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "password_reset_tokens")
class PasswordResetTokenEntity(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    val userId: UUID = UUID(0, 0),

    @Column(nullable = false, unique = true, length = 255)
    val token: String = "",

    @Column(nullable = false)
    val expiresAt: Instant = Instant.EPOCH,

    @Column
    val usedAt: Instant? = null,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now(),
)

fun PasswordResetTokenEntity.toDomain(): PasswordResetToken = PasswordResetToken(
    id = id,
    userId = userId,
    token = token,
    expiresAt = expiresAt,
    usedAt = usedAt,
    createdAt = createdAt,
)

fun PasswordResetToken.toEntity(): PasswordResetTokenEntity = PasswordResetTokenEntity(
    id = id,
    userId = userId,
    token = token,
    expiresAt = expiresAt,
    usedAt = usedAt,
    createdAt = createdAt,
)

