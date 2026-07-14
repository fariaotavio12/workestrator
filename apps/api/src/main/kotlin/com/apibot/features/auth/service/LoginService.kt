package com.apibot.features.auth.service

import com.apibot.features.auth.domain.exception.InvalidCredentialsException
import com.apibot.features.auth.model.UserSession
import com.apibot.features.auth.repository.UserAccountRepository
import com.apibot.features.auth.repository.UserSessionRepository
import com.apibot.features.auth.dto.LoginRequest
import com.apibot.shared.config.AuthProperties
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@Service
class LoginService(
    private val userAccountRepository: UserAccountRepository,
    private val userSessionRepository: UserSessionRepository,
    private val passwordEncoder: PasswordEncoder,
    private val authProperties: AuthProperties,
) {
    fun execute(request: LoginRequest): UserSession {
        val user = userAccountRepository.findByEmail(request.email)
            ?: throw InvalidCredentialsException()

        if (!passwordEncoder.matches(request.password, user.passwordHash)) {
            throw InvalidCredentialsException()
        }

        val session = UserSession(
            token = UUID.randomUUID().toString(),
            userId = user.id,
            email = user.email,
            expiresAt = Instant.now().plus(authProperties.sessionDurationHours, ChronoUnit.HOURS),
        )

        return userSessionRepository.save(session)
    }
}