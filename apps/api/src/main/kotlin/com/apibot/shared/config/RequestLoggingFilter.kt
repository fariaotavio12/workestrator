package com.apibot.shared.config

import com.apibot.shared.extensions.AuthenticatedPrincipal
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.util.UUID

@Component
class RequestLoggingFilter : OncePerRequestFilter() {
    private val logger = LoggerFactory.getLogger(RequestLoggingFilter::class.java)

    override fun shouldNotFilter(request: HttpServletRequest): Boolean {
        val path = request.requestURI ?: ""
        return path.startsWith("/actuator/health")
    }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val traceId = request.getHeader(TRACE_ID_HEADER)?.trim().takeUnless { it.isNullOrBlank() }
            ?: UUID.randomUUID().toString()
        val startedAt = System.currentTimeMillis()
        val method = request.method
        val uri = request.requestURI
        val query = request.queryString?.let { "?$it" }.orEmpty()
        val remoteIp = request.remoteAddr ?: "unknown"

        MDC.put(TRACE_ID_KEY, traceId)
        response.setHeader(TRACE_ID_HEADER, traceId)

        logger.info("--> {} {}{} from={} traceId={}", method, uri, query, remoteIp, traceId)

        try {
            filterChain.doFilter(request, response)
            populateUserMdc()
            val elapsedMs = System.currentTimeMillis() - startedAt
            val status = response.status
            val message = "<-- {} {}{} status={} durationMs={} traceId={}"

            if (status >= 500) {
                logger.error(message, method, uri, query, status, elapsedMs, traceId)
            } else if (status >= 400) {
                logger.warn(message, method, uri, query, status, elapsedMs, traceId)
            } else {
                logger.info(message, method, uri, query, status, elapsedMs, traceId)
            }
        } catch (exception: Exception) {
            val elapsedMs = System.currentTimeMillis() - startedAt
            logger.error(
                "<-- {} {}{} failed durationMs={} traceId={}",
                method,
                uri,
                query,
                elapsedMs,
                traceId,
                exception,
            )
            throw exception
        } finally {
            MDC.remove(USER_ID_KEY)
            MDC.remove(TRACE_ID_KEY)
        }
    }

    private fun populateUserMdc() {
        val auth = SecurityContextHolder.getContext().authentication
        if (auth == null || !auth.isAuthenticated || auth.principal == "anonymousUser") return
        val userId = when (val principal = auth.principal) {
            is AuthenticatedPrincipal -> principal.userId.toString()
            else -> auth.name
        }
        MDC.put(USER_ID_KEY, userId)
    }

    companion object {
        private const val TRACE_ID_KEY = "traceId"
        private const val USER_ID_KEY = "userId"
        private const val TRACE_ID_HEADER = "X-Trace-Id"
    }
}

