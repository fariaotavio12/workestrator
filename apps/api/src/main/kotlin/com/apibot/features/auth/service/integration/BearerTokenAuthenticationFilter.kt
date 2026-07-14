package com.apibot.features.auth.service.integration

import com.apibot.features.auth.service.SessionLookupService
import com.apibot.shared.extensions.AuthenticatedPrincipal
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class BearerTokenAuthenticationFilter(
    private val sessionLookupService: SessionLookupService,
) : OncePerRequestFilter() {
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        if (SecurityContextHolder.getContext().authentication == null) {
            val authHeader = request.getHeader("Authorization")
            val token = authHeader?.removePrefix("Bearer ")?.takeIf { authHeader.startsWith("Bearer ") }

            val session = token?.let(sessionLookupService::findByToken)
            if (session != null) {
                val principal = AuthenticatedPrincipal(
                    userId = session.userId,
                    email = session.email,
                )

                val authentication = UsernamePasswordAuthenticationToken(
                    principal,
                    token,
                    listOf(SimpleGrantedAuthority("ROLE_USER")),
                )
                authentication.details = WebAuthenticationDetailsSource().buildDetails(request)
                SecurityContextHolder.getContext().authentication = authentication
            }
        }

        filterChain.doFilter(request, response)
    }
}

