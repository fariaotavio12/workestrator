package com.apibot.shared.config

import com.apibot.shared.extensions.AuthenticatedPrincipal
import io.sentry.protocol.User
import io.sentry.spring.jakarta.SentryUserProvider
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.core.context.SecurityContextHolder

@Configuration
class SentryUserProviderConfig {

    @Bean
    fun gainzSentryUserProvider(): SentryUserProvider = SentryUserProvider {
        val auth = SecurityContextHolder.getContext().authentication
        if (auth == null || !auth.isAuthenticated || auth.principal == "anonymousUser") return@SentryUserProvider null
        User().apply {
            when (val principal = auth.principal) {
                is AuthenticatedPrincipal -> {
                    id = principal.userId.toString()
                    email = principal.email
                }
                else -> username = auth.name
            }
        }
    }
}
