package com.apibot.features.auth.service.integration

import com.apibot.shared.config.AuthProperties
import org.springframework.http.ResponseCookie
import org.springframework.stereotype.Component
import java.time.Duration

@Component
class AuthCookieFactory(
    private val authProperties: AuthProperties,
) {
    fun create(token: String): ResponseCookie = ResponseCookie.from(authProperties.cookieName, token)
        .httpOnly(true)
        .secure(authProperties.secureCookie)
        .path("/")
        .sameSite(authProperties.sameSite)
        .maxAge(Duration.ofSeconds(authProperties.cookieMaxAge))
        .build()

    fun clear(): ResponseCookie = ResponseCookie.from(authProperties.cookieName, "")
        .httpOnly(true)
        .secure(authProperties.secureCookie)
        .path("/")
        .sameSite(authProperties.sameSite)
        .maxAge(Duration.ZERO)
        .build()
}
