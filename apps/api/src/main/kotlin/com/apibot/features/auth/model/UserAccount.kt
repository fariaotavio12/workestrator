package com.apibot.features.auth.model

import java.util.UUID

data class UserAccount(
    val id: UUID,
    val email: String,
    val passwordHash: String,
)
