package com.apibot.features.auth.service.integration

import com.apibot.shared.exceptions.BusinessRuleViolationException
import com.apibot.shared.service.EmailService
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.security.SecureRandom
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.concurrent.ConcurrentHashMap

@Service
class EmailVerificationCodeService(
    private val emailService: EmailService,
) {
    private val logger = LoggerFactory.getLogger(EmailVerificationCodeService::class.java)
    private val random = SecureRandom()

    private data class Entry(
        val code: String,
        val expiresAt: Instant,
    )

    private val store = ConcurrentHashMap<String, Entry>()

    fun sendCode(email: String, expirationSeconds: Long = 600): Long {
        val normalizedEmail = normalizeEmail(email)
        val expiresAt = Instant.now().plus(expirationSeconds, ChronoUnit.SECONDS)
        val code = (100000 + random.nextInt(900000)).toString()
        val expiresInMinutes = (expirationSeconds / 60).coerceAtLeast(1)

        store[normalizedEmail] = Entry(
            code = code,
            expiresAt = expiresAt,
        )

        val subject = "Seu código de verificação"
        val textMessage = "Seu código de verificação é $code. Ele expira em $expiresInMinutes minutos."

        emailService.sendTemplate(
            to = normalizedEmail,
            subject = subject,
            templateName = "email-verification-code.html",
            variables = mapOf(
                "email" to normalizedEmail,
                "code" to code,
                "expiresMinutes" to expiresInMinutes,
            ),
            textFallback = textMessage,
        )

        logger.info("[EMAIL-VERIFICATION] Código para {}: {} (expira em {})", normalizedEmail, code, expiresAt)
        return expirationSeconds
    }

    fun validateCode(email: String, code: String): Boolean {
        val normalizedEmail = normalizeEmail(email)
        val normalizedCode = code.trim()

        val entry = store[normalizedEmail] ?: return false
        if (entry.expiresAt.isBefore(Instant.now())) {
            store.remove(normalizedEmail)
            return false
        }

        val isValid = entry.code == normalizedCode
        if (isValid) {
            store.remove(normalizedEmail)
        }
        return isValid
    }

    fun requireValidCode(email: String, code: String) {
        if (!validateCode(email, code)) {
            throw BusinessRuleViolationException("Código de verificação inválido ou expirado")
        }
    }

    private fun normalizeEmail(email: String): String = email.trim().lowercase()
}
