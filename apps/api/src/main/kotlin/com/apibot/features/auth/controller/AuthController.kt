package com.apibot.features.auth.controller

import com.apibot.features.auth.service.LoginService
import com.apibot.features.auth.service.SessionLookupService
import com.apibot.features.auth.service.RegisterService
import com.apibot.features.auth.service.PasswordRecoveryService
import com.apibot.features.auth.dto.AuthResponse
import com.apibot.features.auth.dto.CurrentUserResponse
import com.apibot.features.auth.dto.ForgotPasswordRequest
import com.apibot.features.auth.dto.LoginRequest
import com.apibot.features.auth.dto.PasswordRecoveryResponse
import com.apibot.features.auth.dto.RegisterRequest
import com.apibot.features.auth.dto.ResetPasswordRequest
import com.apibot.features.auth.service.integration.AuthCookieFactory
import com.apibot.features.user.service.UserService
import com.apibot.shared.config.AuthProperties
import com.apibot.shared.extensions.AuthenticationPrincipalResolver
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.servlet.http.HttpServletRequest
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseCookie
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping(value = ["/auth"])
@Tag(name = "Authentication")
class AuthController(
    private val loginService: LoginService,
    private val registerService: RegisterService,
    private val sessionLookupService: SessionLookupService,
    private val passwordRecoveryService: PasswordRecoveryService,
    private val authCookieFactory: AuthCookieFactory,
    private val authProperties: AuthProperties,
    private val authenticationPrincipalResolver: AuthenticationPrincipalResolver,
    private val userService: UserService,
) {
    private val logoutHandler = SecurityContextLogoutHandler()

    @GetMapping("/google/url")
    @Operation(summary = "Returns the URL to start Google authentication")
    fun googleAuthUrl(
        @RequestParam(required = false, defaultValue = "google") registrationId: String,
        @RequestParam(required = false) redirectUrl: String?,
    ): Map<String, String> {
        val url = if (!redirectUrl.isNullOrBlank()) {
            val encodedRedirect = URLEncoder.encode(redirectUrl, StandardCharsets.UTF_8)
            "/auth/google/login?registrationId=$registrationId&redirectUrl=$encodedRedirect"
        } else {
            "/oauth2/authorization/$registrationId"
        }
        return mapOf("url" to url)
    }

    @GetMapping("/google/login")
    @Operation(summary = "Redirects the browser to Google login")
    fun googleLoginRedirect(
        @RequestParam(required = false, defaultValue = "google") registrationId: String,
        @RequestParam(required = false) redirectUrl: String?,
        request: HttpServletRequest,
    ): ResponseEntity<Void> {
        if (!redirectUrl.isNullOrBlank()) {
            request.getSession(true).setAttribute("oauth2_redirect_url", redirectUrl)
        }
        return ResponseEntity.status(302)
            .header(HttpHeaders.LOCATION, "/oauth2/authorization/$registrationId")
            .build()
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticates user and returns Bearer token")
    fun login(
        @Valid @RequestBody request: LoginRequest,
        response: HttpServletResponse,
    ): ResponseEntity<AuthResponse> {
        val session = loginService.execute(request)
        val user = userService.getUserById(session.userId)
        response.addHeader(HttpHeaders.SET_COOKIE, authCookieFactory.create(session.token).toString())

        return ResponseEntity.ok(
            AuthResponse(
                userId = user.id,
                email = user.email,
                name = user.name,
                img = user.img,
                isActive = user.isActive,
                token = session.token,
                tokenExpiresAt = session.expiresAt,
                createdAt = user.createdAt,
                updatedAt = user.updatedAt,
                message = "Login successful",
            ),
        )
    }

    @PostMapping("/register")
    @Operation(summary = "Creates a new account and returns Bearer token")
    fun register(
        @Valid @RequestBody request: RegisterRequest,
        response: HttpServletResponse,
    ): ResponseEntity<AuthResponse> {
        val session = registerService.execute(request)
        val user = userService.getUserById(session.userId)
        response.addHeader(HttpHeaders.SET_COOKIE, authCookieFactory.create(session.token).toString())

        return ResponseEntity.status(HttpStatus.CREATED).body(
            AuthResponse(
                userId = user.id,
                email = user.email,
                name = user.name,
                img = user.img,
                isActive = user.isActive,
                token = session.token,
                tokenExpiresAt = session.expiresAt,
                createdAt = user.createdAt,
                updatedAt = user.updatedAt,
                message = "Account created successfully",
            ),
        )
    }

    @PostMapping("/logout")
    @Operation(summary = "Invalidates the current session and clears the cookie")
    @SecurityRequirement(name = "Bearer")
    fun logout(
        request: HttpServletRequest,
        response: HttpServletResponse,
    ): ResponseEntity<Void> {
        val authentication = SecurityContextHolder.getContext().authentication
        val token = request.cookies
            ?.firstOrNull { it.name == authProperties.cookieName }
            ?.value
            ?: request.getHeader(HttpHeaders.AUTHORIZATION)
                ?.takeIf { it.startsWith("Bearer ", ignoreCase = true) }
                ?.removePrefix("Bearer ")
                ?.trim()

        sessionLookupService.logout(token)
        logoutHandler.logout(request, response, authentication)
        response.addHeader(HttpHeaders.SET_COOKIE, authCookieFactory.clear().toString())
        response.addHeader(HttpHeaders.SET_COOKIE, clearCookie("JSESSIONID").toString())
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Requests password recovery by sending a code to the email")
    fun forgotPassword(
        @Valid @RequestBody request: ForgotPasswordRequest,
    ): ResponseEntity<PasswordRecoveryResponse> {
        passwordRecoveryService.requestPasswordReset(request.email)
        return ResponseEntity.ok(
            PasswordRecoveryResponse(message = "If the email is registered, you will receive a recovery code")
        )
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Resets the password using the recovery code")
    fun resetPassword(
        @Valid @RequestBody request: ResetPasswordRequest,
    ): ResponseEntity<PasswordRecoveryResponse> {
        passwordRecoveryService.resetPassword(request.code, request.newPassword)
        return ResponseEntity.ok(
            PasswordRecoveryResponse(message = "Password changed successfully")
        )
    }

    @GetMapping("/me")
    @Operation(summary = "Returns the authenticated user")
    @SecurityRequirement(name = "Bearer")
    fun me(authentication: Authentication): ResponseEntity<CurrentUserResponse> {
        val principal = authenticationPrincipalResolver.resolve(authentication)
        val user = userService.getUserByEmail(principal.email)

        return ResponseEntity.ok(CurrentUserResponse(
            userId = user.id,
            name = user.name,
            email = user.email,
            img = user.img,
            isActive = user.isActive,
            createdAt = user.createdAt,
            updatedAt = user.updatedAt,
        ))
    }

    private fun clearCookie(name: String): ResponseCookie = ResponseCookie.from(name, "")
        .httpOnly(true)
        .secure(authProperties.secureCookie)
        .path("/")
        .sameSite(authProperties.sameSite)
        .maxAge(0)
        .build()
}
