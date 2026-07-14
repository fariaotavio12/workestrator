package com.apibot.features.user.model

import com.apibot.features.user.dto.UserResponse
import java.time.Instant
import java.util.UUID

data class User(
    val id: UUID = UUID.randomUUID(),
    val name: String,
    val email: String,
    val img: String? = null,
    val isActive: Boolean = true,
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now(),
)

fun User.toResponse(): UserResponse = UserResponse(
    id = this.id,
    name = this.name,
    email = this.email,
    isActive = this.isActive,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
