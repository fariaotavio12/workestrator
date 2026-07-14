package com.apibot.shared.exceptions

import com.apibot.features.auth.domain.exception.InvalidCredentialsException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test
import org.springframework.context.support.StaticMessageSource
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.web.server.ResponseStatusException
import org.springframework.http.HttpStatus

class ApiExceptionHandlerTest {
    // StaticMessageSource vazio: sem a chave, ApiMessageResolver devolve a mensagem crua (fallback),
    // então as asserções sobre as mensagens abaixo continuam valendo.
    private val handler = ApiExceptionHandler(ApiMessageResolver(StaticMessageSource()))

    @Test
    fun `handleUnauthorized should return unauthorized payload`() {
        val request = MockHttpServletRequest("GET", "/auth/me")
        request.addHeader("X-Trace-Id", "trace-123")

        val response = handler.handleUnauthorized(UnauthorizedException("Token inválido"), request)

        assertEquals(401, response.statusCode.value())
        assertEquals("Token inválido", response.body!!.message)
        assertEquals("/auth/me", response.body!!.path)
        assertEquals("trace-123", response.body!!.traceId)
        assertEquals("Unauthorized", response.body!!.error)
        assertNotNull(response.body!!.timestamp)
    }

    @Test
    fun `handleBusinessRule should return unprocessable entity payload`() {
        val request = MockHttpServletRequest("POST", "/subscriptions/checkout")

        val response = handler.handleBusinessRule(BusinessRuleViolationException("Plano inválido"), request)

        assertEquals(422, response.statusCode.value())
        assertEquals("Plano inválido", response.body!!.message)
        assertEquals("Unprocessable Entity", response.body!!.error)
        assertEquals("/subscriptions/checkout", response.body!!.path)
    }

    @Test
    fun `handleInvalidCredentials should return unauthorized`() {
        val request = MockHttpServletRequest("POST", "/auth/login")

        val response = handler.handleInvalidCredentials(InvalidCredentialsException(), request)

        assertEquals(401, response.statusCode.value())
        // A exceção carrega a mensagem literal (não uma chave i18n), então o resolver a devolve como está.
        assertEquals("Invalid email or password", response.body!!.message)
        assertEquals("/auth/login", response.body!!.path)
    }

    @Test
    fun `handleResponseStatus should preserve reason and status`() {
        val request = MockHttpServletRequest("GET", "/foo")

        val response = handler.handleResponseStatus(ResponseStatusException(HttpStatus.BAD_GATEWAY, "falha externa"), request)

        assertEquals(502, response.statusCode.value())
        assertEquals("falha externa", response.body!!.message)
        assertEquals("Bad Gateway", response.body!!.error)
    }
}
