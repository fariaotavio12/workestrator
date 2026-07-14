package com.apibot.shared.extensions

import java.security.Principal
import java.util.UUID

data class AuthenticatedPrincipal(
    val userId: UUID,
    val email: String,
) : Principal {
    override fun getName(): String = userId.toString()
}