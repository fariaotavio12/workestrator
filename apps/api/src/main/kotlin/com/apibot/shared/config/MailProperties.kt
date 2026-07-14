package com.apibot.shared.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.mail")
data class MailProperties(
    var enabled: Boolean = false,
    var fromEmail: String = "no-reply@apibot.com",
    var fromName: String = "ApiBot",
)
