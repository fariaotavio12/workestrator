package com.apibot

import com.apibot.shared.constants.CookieAuthentication
import io.swagger.v3.oas.annotations.OpenAPIDefinition
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType
import io.swagger.v3.oas.annotations.info.Info
import io.swagger.v3.oas.annotations.security.SecurityScheme
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableAsync
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@OpenAPIDefinition(
    info = Info(
        title = "Gainz API",
        version = "v1",
        description = "Backend Kotlin + Spring Boot do Gainz com autenticação por cookie e bearer token",
    ),
)
@SecurityScheme(
    name = CookieAuthentication.SECURITY_SCHEME,
    type = SecuritySchemeType.APIKEY,
    `in` = SecuritySchemeIn.COOKIE,
    paramName = CookieAuthentication.COOKIE_NAME,
    description = "Use o endpoint de login para criar o cookie de autenticação",
)
@SecurityScheme(
    name = "Bearer",
    type = SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "UUID session token",
    description = "Token de sessão retornado no login para clientes mobile/API",
)
@EnableScheduling
@EnableAsync
@ConfigurationPropertiesScan
class ApibotApplication

fun main(args: Array<String>) {
    runApplication<ApibotApplication>(*args)
}
