package com.apibot.shared.config

import com.apibot.features.auth.service.integration.BearerTokenAuthenticationFilter
import com.apibot.features.auth.service.integration.CookieAuthenticationFilter
import com.apibot.features.auth.service.integration.GoogleOAuth2SuccessHandler
import com.apibot.shared.exceptions.CustomAccessDeniedHandler
import com.apibot.shared.exceptions.CustomAuthenticationEntryPoint
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpStatus
import org.springframework.http.HttpMethod
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(AuthProperties::class, CorsProperties::class)
class SecurityConfig(
    private val cookieAuthenticationFilter: CookieAuthenticationFilter,
    private val bearerTokenAuthenticationFilter: BearerTokenAuthenticationFilter,
    private val googleOAuth2SuccessHandler: GoogleOAuth2SuccessHandler,
    private val customAuthenticationEntryPoint: CustomAuthenticationEntryPoint,
    private val customAccessDeniedHandler: CustomAccessDeniedHandler,
    private val corsProperties: CorsProperties,
) {
    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val configuration = CorsConfiguration().apply {
            allowedOriginPatterns = corsProperties.allowedOriginPatterns
            allowedMethods = corsProperties.allowedMethods
            allowedHeaders = corsProperties.allowedHeaders
            exposedHeaders = corsProperties.exposedHeaders
            allowCredentials = corsProperties.allowCredentials
            maxAge = corsProperties.maxAge
        }

        return UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/**", configuration)
        }
    }

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain = http
        .cors { }
        .csrf { it.disable() }
        .httpBasic { it.disable() }
        .formLogin { it.disable() }
        .logout { it.disable() }
        .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED) }
        .exceptionHandling {
            it.authenticationEntryPoint(customAuthenticationEntryPoint)
                .accessDeniedHandler(customAccessDeniedHandler)
        }
        .oauth2Login {
            it.successHandler(googleOAuth2SuccessHandler)
                .failureHandler { _, response, _ -> response.sendError(HttpStatus.UNAUTHORIZED.value()) }
        }
        .authorizeHttpRequests {
            it.requestMatchers(
                HttpMethod.OPTIONS,
                "/**",
            ).permitAll()
                .requestMatchers(
                "/auth/login",
                "/auth/register",
                "/auth/email/verification-code",
                "/auth/password/forgot",
                "/auth/password/reset",
                "/auth/forgot-password",
                "/auth/reset-password",
                "/auth/google/url",
                "/auth/google/login",
                "/auth/login",
                "/auth/register",
                "/auth/password/forgot",
                "/auth/password/reset",
                "/auth/forgot-password",
                "/auth/reset-password",
                "/auth/google/url",
                "/auth/google/login",
                "/oauth2/**",
                "/login/oauth2/**",
                "/swagger-ui.html",
                "/swagger-ui/**",
                "/v3/api-docs/**",
                "/public/**",
                "/public/**",
                "/waha/webhook",
                "/subscriptions/webhook/stripe",
            ).permitAll()
                .requestMatchers(HttpMethod.GET, "/explore/assets").permitAll()
                .requestMatchers(HttpMethod.GET, "/shares/*").permitAll()
                .anyRequest().authenticated()
        }
        .addFilterBefore(bearerTokenAuthenticationFilter, AnonymousAuthenticationFilter::class.java)
        .addFilterBefore(cookieAuthenticationFilter, AnonymousAuthenticationFilter::class.java)
        .build()
}
