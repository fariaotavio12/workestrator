package com.apibot.shared.config

import org.springframework.context.MessageSource
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.support.ReloadableResourceBundleMessageSource

@Configuration
class MessageSourceConfig {
    @Bean
    fun messageSource(): MessageSource {
        return ReloadableResourceBundleMessageSource().apply {
            setBasenames("classpath:messages")
            setDefaultEncoding("UTF-8")
            setFallbackToSystemLocale(false)
            setUseCodeAsDefaultMessage(false)
        }
    }
}
