package com.apibot.shared.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.cors")
data class CorsProperties(
    var allowedOriginPatterns: List<String> = listOf(
        "http://localhost:*",
        "https://localhost:*",
        "http://127.0.0.1:*",
        "https://127.0.0.1:*",
    ),
    var allowedMethods: List<String> = listOf("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"),
    var allowedHeaders: List<String> = listOf("*"),
    var exposedHeaders: List<String> = listOf("X-Trace-Id"),
    var allowCredentials: Boolean = true,
    var maxAge: Long = 3600,
)
