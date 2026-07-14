package com.apibot.shared.config

import com.apibot.shared.constants.CookieAuthentication
import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.auth")
data class AuthProperties(
    var cookieName: String = CookieAuthentication.COOKIE_NAME,
    var cookieMaxAge: Long = 28800,
    var sessionDurationHours: Long = 8,
    var secureCookie: Boolean = true,
    var sameSite: String = "Lax",
    var googleSuccessRedirect: String = "http://localhost:8080/auth/google/success",
    var passwordResetBaseUrl: String = "http://localhost:8080/reset-password",
    var allowedRedirectHosts: List<String> = listOf("localhost", "127.0.0.1"),
    var allowTokenInQueryRedirect: Boolean = false,
)
