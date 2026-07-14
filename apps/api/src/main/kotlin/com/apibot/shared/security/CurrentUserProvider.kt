package com.apibot.shared.security

import com.apibot.shared.exceptions.UnauthorizedException
import com.apibot.shared.extensions.AuthenticatedPrincipal
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class CurrentUserProvider {
    fun getCurrentUserId(): UUID = getCurrentPrincipal().userId

    fun getCurrentUserEmail(): String = getCurrentPrincipal().email

    fun getCurrentPrincipal(): AuthenticatedPrincipal {
        val authentication = SecurityContextHolder.getContext().authentication
            ?: throw UnauthorizedException("Usuário não autenticado")

        val principal = authentication.principal
        return principal as? AuthenticatedPrincipal
            ?: throw UnauthorizedException("Usuário autenticado inválido")
    }
}
