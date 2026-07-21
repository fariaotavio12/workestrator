package com.apibot.features.runstep.service.integration

import com.apibot.features.secret.dto.SecretValueResponse
import com.apibot.features.secret.dto.UpdateSecretValueRequest
import com.apibot.features.secret.model.SecretAuthType
import com.apibot.features.secret.service.SecretService
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.util.Base64
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * Auth scheme resolution shared by the LLM provider's `apiKeyRef` and a tool's `authRef` — a Kotlin
 * port of `applyAuthToHttpTarget`/`exchangeOAuth2Token` from the Electron runner
 * (`apps/web/electron/runner/runner.ts`), so a squad of pure API-key providers can execute without the
 * desktop app. Secrets are resolved in-process via `SecretService` (same JVM now, no HTTP round-trip
 * to itself like the Electron runner's `createBackendSecretResolver` needed).
 */
@Component
class ProviderAuthResolver(
    private val secretService: SecretService,
    private val httpClient: HttpClient,
    private val objectMapper: ObjectMapper,
) {
    private val logger = LoggerFactory.getLogger(ProviderAuthResolver::class.java)
    private val oauthTokenCache = ConcurrentHashMap<UUID, CachedToken>()

    private val knownAuthMetadataKeys =
        setOf("headerName", "valuePrefix", "queryParam", "basicUsername", "tokenUrl", "clientId", "scopes")

    data class HttpAuthTarget(val headers: Map<String, String>, val url: String)
    data class ProviderAuth(val headers: Map<String, String>, val querySuffix: String)
    private data class CachedToken(val accessToken: String, val expiresAt: Instant)

    /** Resolves the LLM provider's own key against a sentinel empty target — `querySuffix` is whatever a `query`-scheme auth appended. */
    fun resolveProviderAuth(userId: UUID, apiKeyRef: String?): ProviderAuth {
        val resolved = tryResolveSecret(userId, apiKeyRef) ?: return ProviderAuth(emptyMap(), "")
        val (secretId, value) = resolved
        val applied = applyAuthToHttpTarget(userId, secretId, value, HttpAuthTarget(emptyMap(), ""))
        return ProviderAuth(applied.headers, applied.url)
    }

    /** Resolves a tool's `authRef` directly against its real URL/headers. */
    fun resolveToolAuth(userId: UUID, authRef: String?, target: HttpAuthTarget): HttpAuthTarget {
        val resolved = tryResolveSecret(userId, authRef) ?: return target
        val (secretId, value) = resolved
        return applyAuthToHttpTarget(userId, secretId, value, target)
    }

    private fun tryResolveSecret(userId: UUID, ref: String?): Pair<UUID, SecretValueResponse>? {
        if (ref.isNullOrBlank()) return null
        val secretId = runCatching { UUID.fromString(ref) }.getOrNull() ?: return null
        val value = runCatching { secretService.resolveValue(userId, secretId) }.getOrElse {
            logger.warn("Falha ao resolver secret {}: {}", secretId, it.message)
            return null
        }
        return secretId to value
    }

    private fun applyAuthToHttpTarget(
        userId: UUID,
        secretId: UUID,
        resolved: SecretValueResponse,
        target: HttpAuthTarget,
    ): HttpAuthTarget {
        val headers = target.headers + fixedMetadataHeaders(resolved.metadata)
        var url = target.url
        val authHeaders = mutableMapOf<String, String>()

        when (resolved.authType) {
            SecretAuthType.BEARER -> authHeaders["Authorization"] = "Bearer ${resolved.value}"
            SecretAuthType.HEADER -> {
                val headerName = resolved.metadata?.get("headerName") ?: "Authorization"
                val prefix = resolved.metadata?.get("valuePrefix") ?: ""
                authHeaders[headerName] = "$prefix${resolved.value}"
            }
            SecretAuthType.QUERY -> {
                val param = resolved.metadata?.get("queryParam") ?: "key"
                val separator = if (url.contains("?")) "&" else "?"
                url = "$url$separator${urlEncode(param)}=${urlEncode(resolved.value)}"
            }
            SecretAuthType.BASIC -> {
                val password = readJsonField(resolved.value, "password") ?: resolved.value
                val username = resolved.metadata?.get("basicUsername") ?: ""
                val token = Base64.getEncoder().encodeToString("$username:$password".toByteArray(StandardCharsets.UTF_8))
                authHeaders["Authorization"] = "Basic $token"
            }
            SecretAuthType.OAUTH2_CLIENT_CREDENTIALS, SecretAuthType.OAUTH2_REFRESH ->
                authHeaders["Authorization"] = "Bearer ${exchangeOAuth2Token(userId, secretId, resolved)}"
            SecretAuthType.RAW -> Unit
        }

        return HttpAuthTarget(headers + authHeaders, url)
    }

    private fun fixedMetadataHeaders(metadata: Map<String, String>?): Map<String, String> =
        metadata?.filterKeys { it !in knownAuthMetadataKeys } ?: emptyMap()

    private fun readJsonField(raw: String, field: String): String? =
        runCatching { objectMapper.readTree(raw).get(field)?.asText() }.getOrNull()

    private fun urlEncode(value: String): String = URLEncoder.encode(value, StandardCharsets.UTF_8)

    /** `client_credentials`/`refresh_token` exchange, cached in-memory per secret id, rotating a reissued refresh token back onto the Secret. */
    private fun exchangeOAuth2Token(userId: UUID, secretId: UUID, resolved: SecretValueResponse): String {
        oauthTokenCache[secretId]?.let { cached ->
            if (cached.expiresAt.isAfter(Instant.now().plusSeconds(5))) return cached.accessToken
        }

        val tokenUrl = resolved.metadata?.get("tokenUrl")
            ?: throw IllegalStateException("Secret OAuth2 sem metadata.tokenUrl configurado.")

        val form = StringBuilder()
        fun append(key: String, value: String) {
            if (form.isNotEmpty()) form.append('&')
            form.append(urlEncode(key)).append('=').append(urlEncode(value))
        }

        if (resolved.authType == SecretAuthType.OAUTH2_CLIENT_CREDENTIALS) {
            val clientSecret = readJsonField(resolved.value, "clientSecret") ?: resolved.value
            append("grant_type", "client_credentials")
            resolved.metadata?.get("clientId")?.let { append("client_id", it) }
            append("client_secret", clientSecret)
        } else {
            val refreshToken = readJsonField(resolved.value, "refreshToken") ?: resolved.value
            val clientSecret = readJsonField(resolved.value, "clientSecret")
            append("grant_type", "refresh_token")
            resolved.metadata?.get("clientId")?.let { append("client_id", it) }
            append("refresh_token", refreshToken)
            clientSecret?.let { append("client_secret", it) }
        }
        resolved.metadata?.get("scopes")?.let { append("scope", it) }

        val request = HttpRequest.newBuilder(URI.create(tokenUrl))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(form.toString()))
            .build()

        val response = try {
            httpClient.send(request, HttpResponse.BodyHandlers.ofString())
        } catch (ex: Exception) {
            oauthTokenCache.remove(secretId)
            throw IllegalStateException("Troca de token OAuth2 falhou: ${ex.message}", ex)
        }
        if (response.statusCode() !in 200..299) {
            oauthTokenCache.remove(secretId)
            throw IllegalStateException("Troca de token OAuth2 falhou (HTTP ${response.statusCode()}).")
        }

        val body = objectMapper.readTree(response.body())
        val accessToken = body.get("access_token")?.asText()
            ?: throw IllegalStateException("Resposta de troca de token OAuth2 sem access_token.")
        val expiresIn = body.get("expires_in")?.asLong() ?: 3600L
        oauthTokenCache[secretId] = CachedToken(accessToken, Instant.now().plusSeconds(expiresIn))

        val newRefreshToken = body.get("refresh_token")?.asText()
        if (resolved.authType == SecretAuthType.OAUTH2_REFRESH && !newRefreshToken.isNullOrBlank()) {
            val previousRefreshToken = readJsonField(resolved.value, "refreshToken")
            if (newRefreshToken != previousRefreshToken) {
                val clientSecret = readJsonField(resolved.value, "clientSecret")
                val newValue = objectMapper.writeValueAsString(
                    mapOf("refreshToken" to newRefreshToken, "clientSecret" to clientSecret),
                )
                runCatching { secretService.updateSecretValue(userId, secretId, UpdateSecretValueRequest(newValue)) }
                    .onFailure { logger.error("Falha ao persistir refresh_token rotacionado do secret {}: {}", secretId, it.message) }
            }
        }

        return accessToken
    }
}
