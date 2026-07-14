package com.apibot.features.auth.service.integration

import com.apibot.features.auth.model.UserSession
import com.apibot.features.auth.repository.UserSessionRepository
import com.apibot.features.user.model.User
import com.apibot.features.user.repository.UserRepository
import com.apibot.shared.config.AuthProperties
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpHeaders
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.stereotype.Component
import java.net.URI
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@Component
class GoogleOAuth2SuccessHandler(
    private val authProperties: AuthProperties,
    private val userSessionRepository: UserSessionRepository,
    private val authCookieFactory: AuthCookieFactory,
    private val userRepository: UserRepository,
) : AuthenticationSuccessHandler {
    private val logger = LoggerFactory.getLogger(GoogleOAuth2SuccessHandler::class.java)

    override fun onAuthenticationSuccess(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authentication: Authentication,
    ) {
        val oauthUser = authentication.principal as OAuth2User
        val email = oauthUser.getAttribute<String>("email")

        if (email.isNullOrBlank()) {
            logger.error("OAuth2 Google: failed to get user email")
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Could not retrieve email from Google account")
            return
        }

        var registeredUser = userRepository.findByEmail(email)
        val googlePicture = oauthUser.getAttribute<String>("picture")

        if (registeredUser == null) {
            val googleName = oauthUser.getAttribute<String>("name") ?: "Google User"
            val newUser = User(
                id = UUID.randomUUID(),
                email = email,
                name = googleName,
                img = googlePicture,
                isActive = true,
                createdAt = Instant.now(),
                updatedAt = Instant.now(),
            )
            registeredUser = userRepository.save(newUser)
            logger.info("New account created via Google OAuth: {}", email)
        }

        if (!registeredUser.isActive) {
            request.getSession(false)?.invalidate()
            logger.warn("Login attempt with inactive user: {}", email)
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Inactive user")
            return
        }

        val session = UserSession(
            token = UUID.randomUUID().toString(),
            userId = registeredUser.id,
            email = email,
            expiresAt = Instant.now().plus(authProperties.sessionDurationHours, ChronoUnit.HOURS),
        )

        userSessionRepository.save(session)
        response.addHeader(HttpHeaders.SET_COOKIE, authCookieFactory.create(session.token).toString())

        val requestedRedirect = request.getSession(false)?.getAttribute("oauth2_redirect_url") as? String
        request.getSession(false)?.invalidate()
        logger.info("Google login successful for: {}", email)

        val finalRedirectUrl = resolveRedirectUrl(requestedRedirect, session)
        response.sendRedirect(finalRedirectUrl)
    }

    private fun resolveRedirectUrl(requestedRedirect: String?, session: UserSession): String {
        val candidate = requestedRedirect?.takeIf(::isAllowedRedirect) ?: authProperties.googleSuccessRedirect
        if (authProperties.allowTokenInQueryRedirect) {
            val separator = if (candidate.contains("?")) "&" else "?"
            return "$candidate${separator}token=${session.token}"
        }
        return candidate
    }

    private fun isAllowedRedirect(url: String): Boolean = try {
        val uri = URI(url)
        uri.host.isNullOrBlank() ||
        authProperties.allowedRedirectHosts.contains("*") ||
        authProperties.allowedRedirectHosts.any { allowed ->
            uri.host.equals(allowed, ignoreCase = true) || uri.host.endsWith(".$allowed", ignoreCase = true)
        }
    } catch (_: Exception) {
        false
    }
}
