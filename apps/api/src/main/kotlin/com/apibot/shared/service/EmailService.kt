package com.apibot.shared.service

import com.apibot.shared.config.MailProperties
import com.apibot.shared.exceptions.BusinessRuleViolationException
import com.apibot.shared.exceptions.ServiceUnavailableException
import jakarta.mail.internet.MimeMessage
import org.slf4j.LoggerFactory
import org.springframework.core.io.ResourceLoader
import org.springframework.beans.factory.annotation.Value
import org.springframework.mail.MailAuthenticationException
import org.springframework.mail.MailSendException
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Service
import java.nio.charset.StandardCharsets

@Service
class EmailService(
    private val mailSender: JavaMailSender,
    private val mailProperties: MailProperties,
    private val resourceLoader: ResourceLoader,
    @Value("\${spring.mail.username:}") private val smtpUsername: String,
    @Value("\${spring.mail.host:}") private val smtpHost: String,
) {
    private val logger = LoggerFactory.getLogger(EmailService::class.java)

    fun sendText(to: String, subject: String, message: String) {
        sendEmail(
            to = to,
            subject = subject,
            textBody = message,
            htmlBody = null,
        )
    }

    fun sendHtml(to: String, subject: String, html: String, textFallback: String? = null) {
        sendEmail(
            to = to,
            subject = subject,
            textBody = textFallback ?: htmlToPlainText(html),
            htmlBody = html,
        )
    }

    fun sendTemplate(
        to: String,
        subject: String,
        templateName: String,
        variables: Map<String, Any?> = emptyMap(),
        textFallback: String? = null,
    ) {
        val html = renderTemplate(templateName, variables)
        sendHtml(
            to = to,
            subject = subject,
            html = html,
            textFallback = textFallback,
        )
    }

    private fun sendEmail(
        to: String,
        subject: String,
        textBody: String?,
        htmlBody: String?,
    ) {
        if (!mailProperties.enabled) {
            logger.warn("[EMAIL] app.mail.enabled=false. Email não enviado para {}. Assunto: {}", to, subject)
            return
        }

        try {
            val message: MimeMessage = mailSender.createMimeMessage()
            val helper = MimeMessageHelper(message, htmlBody != null, StandardCharsets.UTF_8.name())
            helper.setTo(to)
            helper.setSubject(subject)

            val fromEmail = resolveFromEmail()
            val fromName = mailProperties.fromName.trim()
            if (fromName.isBlank()) {
                helper.setFrom(fromEmail)
            } else {
                helper.setFrom(fromEmail, fromName)
            }

            if (htmlBody != null) {
                helper.setText(textBody ?: htmlToPlainText(htmlBody), htmlBody)
            } else {
                helper.setText(textBody.orEmpty())
            }

            mailSender.send(message)
            logger.info("[EMAIL] Enviado com sucesso para {} (assunto: {})", to, subject)
        } catch (ex: MailAuthenticationException) {
            logger.error("[EMAIL] Falha de autenticação SMTP para {}", to, ex)
            throw ServiceUnavailableException("Falha de autenticação SMTP. Verifique spring.mail.username e spring.mail.password")
        } catch (ex: MailSendException) {
            logger.error("[EMAIL] Falha de envio SMTP para {}", to, ex)
            throw ServiceUnavailableException("Falha ao enviar email. Verifique remetente e configuração SMTP")
        } catch (ex: Exception) {
            logger.error("[EMAIL] Falha ao enviar email para {}", to, ex)
            throw ServiceUnavailableException("Não foi possível enviar o email no momento")
        }
    }

    private fun resolveFromEmail(): String {
        val configuredFrom = mailProperties.fromEmail.trim()
        val normalizedHost = smtpHost.trim().lowercase()
        val normalizedUsername = smtpUsername.trim()

        if (configuredFrom.isBlank() && normalizedUsername.isBlank()) {
            throw BusinessRuleViolationException("Configuração de e-mail inválida: defina app.mail.from-email ou spring.mail.username")
        }

        if (normalizedHost.contains("gmail") && normalizedUsername.isNotBlank() && configuredFrom != normalizedUsername) {
            logger.warn("[EMAIL] Gmail detectado: usando spring.mail.username como remetente para evitar rejeição do SMTP")
            return normalizedUsername
        }

        return if (configuredFrom.isNotBlank()) configuredFrom else normalizedUsername
    }

    private fun renderTemplate(templateName: String, variables: Map<String, Any?>): String {
        val normalizedTemplateName = templateName.removePrefix("/")
        val templatePath = "classpath:templates/emails/$normalizedTemplateName"
        val resource = resourceLoader.getResource(templatePath)

        if (!resource.exists()) {
            throw BusinessRuleViolationException("Template de email '$templateName' não encontrado")
        }

        val template = resource.inputStream.bufferedReader(StandardCharsets.UTF_8).use { it.readText() }
        var rendered = template

        variables.forEach { (key, value) ->
            val regex = Regex("\\{\\{\\s*${Regex.escape(key)}\\s*}}")
            rendered = rendered.replace(regex, value?.toString().orEmpty())
        }

        return rendered
    }

    private fun htmlToPlainText(html: String): String =
        html
            .replace(Regex("<style[\\s\\S]*?</style>", RegexOption.IGNORE_CASE), "")
            .replace(Regex("<script[\\s\\S]*?</script>", RegexOption.IGNORE_CASE), "")
            .replace(Regex("<[^>]+>"), " ")
            .replace("&nbsp;", " ")
            .replace(Regex("\\s+"), " ")
            .trim()
}
