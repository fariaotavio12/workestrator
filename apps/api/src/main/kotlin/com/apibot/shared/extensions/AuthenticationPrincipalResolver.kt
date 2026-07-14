package com.apibot.shared.extensions

import com.apibot.shared.exceptions.UnauthorizedException
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class AuthenticationPrincipalResolver(
    private val userRepository: com.apibot.features.user.repository.JpaUserRepository
) {
    fun resolve(authentication: Authentication): AuthenticatedPrincipal {
        val principal = authentication.principal

        return when (principal) {
            is AuthenticatedPrincipal -> principal
            is OAuth2User -> {
                val email = principal.getAttribute<String>("email")
                    ?: throw UnauthorizedException("Authenticated user has no email")

                val user = userRepository.findByEmailIgnoreCase(email)
                    ?: userRepository.save(com.apibot.features.user.model.UserEntity(
                        name = principal.getAttribute<String>("name") ?: email,
                        email = email,
                        img = principal.getAttribute<String>("picture")
                    ))

                AuthenticatedPrincipal(
                    userId = user.id,
                    email = user.email,
                )
            }
            else -> throw UnauthorizedException("Unsupported principal type: ${principal::class.qualifiedName}")
        }
    }
}