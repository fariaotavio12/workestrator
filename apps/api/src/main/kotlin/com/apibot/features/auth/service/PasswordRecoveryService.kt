package com.apibot.features.auth.service

import com.apibot.features.auth.repository.PasswordResetTokenRepository
import com.apibot.features.auth.repository.UserAccountRepository
import com.apibot.features.user.repository.UserRepository
import com.apibot.shared.exceptions.BusinessRuleViolationException
import com.apibot.shared.service.EmailService
import com.apibot.features.auth.repository.UserSessionRepository
import com.apibot.features.auth.model.PasswordResetToken
import org.slf4j.LoggerFactory
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID
import kotlin.random.Random

@Service
class PasswordRecoveryService(
    private val userAccountRepository: UserAccountRepository,
    private val userRepository: UserRepository,
    private val passwordResetTokenRepository: PasswordResetTokenRepository,
    private val emailService: EmailService,
    private val passwordEncoder: PasswordEncoder,
    private val userSessionRepository: UserSessionRepository,
) {
    private val logger = LoggerFactory.getLogger(PasswordRecoveryService::class.java)
    
    companion object {
        private const val TOKEN_EXPIRY_MINUTES = 30L
    }

    /**
     * Solicita recuperação de senha enviando código para o email
     */
    @Transactional
    fun requestPasswordReset(email: String) {
        val userAccount = userAccountRepository.findByEmail(email)
        
        if (userAccount == null) {
            // Verifica se é um usuário OAuth2 (Google)
            val oauthUser = userRepository.findByEmail(email)
            if (oauthUser != null) {
                logger.info("Tentativa de reset de senha para usuário OAuth2 (Google): {}", email)
                throw BusinessRuleViolationException(
                    "Sua conta foi autenticada via Google. " +
                    "Para recuperar acesso, use a opção de login do Google ou entre em contato com o suporte."
                )
            }
            
            // Por segurança, não informamos se o email existe ou não
            logger.info("Solicitação de reset de senha para email não registrado: {}", email)
            return
        }

        // Gera novo código de 6 dígitos
        val code = generateRecoveryCode()
        val expiresAt = Instant.now().plus(TOKEN_EXPIRY_MINUTES, ChronoUnit.MINUTES)

        val existingToken = passwordResetTokenRepository.findByUserId(userAccount.id)
        val resetToken = if (existingToken != null) {
            existingToken.copy(
                token = code,
                expiresAt = expiresAt,
                usedAt = null,
                createdAt = Instant.now(),
            )
        } else {
            PasswordResetToken(
                userId = userAccount.id,
                token = code,
                expiresAt = expiresAt,
            )
        }

        if (existingToken != null) {
            passwordResetTokenRepository.update(resetToken)
        } else {
            passwordResetTokenRepository.save(resetToken)
        }
        
        logger.info("Código de reset gerado para usuário: {}", userAccount.id)
        
        // Envia email com código
        sendPasswordResetEmail(email, code)
    }

    /**
     * Reseta a senha usando o token válido
     */
    @Transactional
    fun resetPassword(code: String, newPassword: String) {
        val resetToken = passwordResetTokenRepository.findByToken(code)
            ?: throw BusinessRuleViolationException("Código de recuperação inválido ou expirado")

        // Valida expiração
        if (Instant.now().isAfter(resetToken.expiresAt)) {
            throw BusinessRuleViolationException("Código de recuperação expirou")
        }

        // Valida se token já foi usado
        if (resetToken.usedAt != null) {
            throw BusinessRuleViolationException("Código de recuperação já foi utilizado")
        }

        // Busca usuário por ID
        val userAccount = userAccountRepository.findById(resetToken.userId)
            ?: throw BusinessRuleViolationException("Usuário não encontrado")
        
        // Atualiza senha do usuário
        val updatedAccount = userAccount.copy(
            passwordHash = passwordEncoder.encode(newPassword)
        )
        userAccountRepository.save(updatedAccount)

        // Marca token como utilizado
        val usedToken = resetToken.copy(usedAt = Instant.now())
        passwordResetTokenRepository.update(usedToken)
        userSessionRepository.deleteByUserId(resetToken.userId)

        logger.info("Senha resetada com sucesso para usuário: {}", resetToken.userId)
    }

    private fun generateRecoveryCode(): String =
        (1..6).map { Random.nextInt(0, 10) }.joinToString("")

    private fun sendPasswordResetEmail(email: String, code: String) {
        try {
            emailService.sendTemplate(
                to = email,
                subject = "Recuperação de Senha - Código: $code",
                templateName = "password-recovery.html",
                variables = mapOf(
                    "code" to code,
                    "expiryMinutes" to TOKEN_EXPIRY_MINUTES,
                ),
                textFallback = "Código de recuperação: $code",
            )
            
            logger.info("Email de recuperação de senha enviado para: {}", email)
        } catch (ex: Exception) {
            logger.error("Falha ao enviar email de recuperação para {}: {}", email, ex.message, ex)
            // Não lançamos exceção para não expor informações de email
        }
    }
}

