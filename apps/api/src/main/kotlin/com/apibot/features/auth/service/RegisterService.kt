package com.apibot.features.auth.service

import com.apibot.features.auth.dto.RegisterRequest
import com.apibot.features.auth.model.UserAccount
import com.apibot.features.auth.model.UserSession
import com.apibot.features.auth.repository.UserAccountRepository
import com.apibot.features.auth.repository.UserSessionRepository
import com.apibot.features.user.domain.exception.UserAlreadyExistsException
import com.apibot.features.user.model.User
import com.apibot.features.user.repository.UserRepository
import com.apibot.shared.config.AuthProperties
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@Service
class RegisterService(
    private val userAccountRepository: UserAccountRepository,
    private val userRepository: UserRepository,
    private val userSessionRepository: UserSessionRepository,
    private val passwordEncoder: PasswordEncoder,
    private val authProperties: AuthProperties,
) {
    @Transactional
    fun execute(request: RegisterRequest): UserSession {
        if (userAccountRepository.findByEmail(request.email) != null) {
            throw UserAlreadyExistsException(request.email)
        }

        val user = User(
            name = request.name,
            email = request.email,
            isActive = true,
        )
        val savedUser = userRepository.save(user)

        val userAccount = UserAccount(
            id = savedUser.id,
            email = request.email,
            passwordHash = passwordEncoder.encode(request.password),
        )
        userAccountRepository.save(userAccount)

        val session = UserSession(
            token = UUID.randomUUID().toString(),
            userId = savedUser.id,
            email = request.email,
            expiresAt = Instant.now().plus(authProperties.sessionDurationHours, ChronoUnit.HOURS),
        )

        return userSessionRepository.save(session)
    }
}
