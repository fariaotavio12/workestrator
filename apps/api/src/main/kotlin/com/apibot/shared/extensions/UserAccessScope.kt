package com.apibot.shared.extensions

import com.apibot.features.user.repository.UserRepository
import com.apibot.shared.exceptions.ForbiddenException
import org.springframework.security.core.Authentication
import org.springframework.stereotype.Component
import java.util.UUID

data class UserAccessScope(
    val userId: UUID,
    val email: String,
) {
    fun requireActive() {
        // placeholder for future access control rules
    }
}

@Component
class UserAccessScopeResolver(
    private val authenticationPrincipalResolver: AuthenticationPrincipalResolver,
    private val userRepository: UserRepository,
) {
    fun resolve(authentication: Authentication): UserAccessScope {
        val principal = authenticationPrincipalResolver.resolve(authentication)
        val user = userRepository.findByEmail(principal.email)
            ?: throw ForbiddenException("Authenticated user has no profile")

        if (!user.isActive) {
            throw ForbiddenException("Inactive user")
        }

        return UserAccessScope(
            userId = user.id,
            email = user.email,
        )
    }
}
