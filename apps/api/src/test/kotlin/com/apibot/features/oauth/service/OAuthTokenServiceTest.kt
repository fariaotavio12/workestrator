package com.apibot.features.oauth.service

import com.apibot.features.oauth.domain.exception.UnsupportedOAuthSecretException
import com.apibot.features.oauth.model.OAuthToken
import com.apibot.features.oauth.repository.OAuthTokenRepository
import com.apibot.features.oauth.service.http.OAuthHttpClient
import com.apibot.features.oauth.service.http.ProviderTokenResponse
import com.apibot.features.oauth.service.strategy.StandardTokenStrategy
import com.apibot.features.secret.crypto.SecretCipher
import com.apibot.features.secret.crypto.SecretCryptoProperties
import com.apibot.features.secret.model.Secret
import com.apibot.features.secret.model.SecretAuthType
import com.apibot.features.secret.repository.SecretRepository
import com.apibot.features.secret.service.SecretService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.Base64
import java.util.UUID

/** In-memory fake — o projeto so tem `kotlin-test-junit5`, sem lib de mock. */
private class FakeSecretRepository : SecretRepository {
    val store = mutableMapOf<UUID, Secret>()
    override fun save(secret: Secret): Secret {
        store[secret.id] = secret
        return secret
    }
    override fun findById(id: UUID): Secret? = store[id]
    override fun findAllByUserId(userId: UUID): List<Secret> = store.values.filter { it.userId == userId }
    override fun deleteById(id: UUID) {
        store.remove(id)
    }
}

private class FakeOAuthTokenRepository : OAuthTokenRepository {
    val store = mutableMapOf<UUID, OAuthToken>()
    override fun findBySecretId(secretId: UUID): OAuthToken? = store[secretId]
    override fun save(token: OAuthToken): OAuthToken {
        store[token.secretId] = token
        return token
    }
}

private class FakeOAuthHttpClient(
    private val response: () -> ProviderTokenResponse,
) : OAuthHttpClient {
    var callCount = 0
        private set
    var lastBasicAuth: Pair<String, String>? = null

    override fun exchangeToken(
        tokenUrl: String,
        params: Map<String, String>,
        basicAuth: Pair<String, String>?,
        acceptJson: Boolean,
    ): ProviderTokenResponse {
        callCount++
        lastBasicAuth = basicAuth
        return response()
    }

    override fun fetchToken(url: String): ProviderTokenResponse = error("not used by StandardTokenStrategy")
}

class OAuthTokenServiceTest {
    private val cipher = SecretCipher(SecretCryptoProperties(Base64.getEncoder().encodeToString(ByteArray(32) { 7 })))
    private val userId: UUID = UUID.randomUUID()

    private fun buildService(
        httpClient: OAuthHttpClient,
    ): Triple<OAuthTokenService, FakeSecretRepository, FakeOAuthTokenRepository> {
        val secretRepository = FakeSecretRepository()
        val tokenRepository = FakeOAuthTokenRepository()
        val secretService = SecretService(secretRepository, cipher)
        val service = OAuthTokenService(secretService, tokenRepository, cipher, listOf(StandardTokenStrategy(httpClient)))
        return Triple(service, secretRepository, tokenRepository)
    }

    private fun oauthRefreshSecret(value: String, connectorId: String? = null): Secret = Secret(
        id = UUID.randomUUID(),
        userId = userId,
        label = "test",
        authType = SecretAuthType.OAUTH2_REFRESH,
        metadata = mapOf("tokenUrl" to "https://provider.example.com/token", "clientId" to "client-1"),
        connectorId = connectorId,
        valueCiphertext = cipher.encrypt(userId, value),
    )

    @Test
    fun `returns cached access token without hitting the provider when still valid`() {
        val secret = oauthRefreshSecret("""{"refreshToken":"old-refresh"}""")
        val httpClient = FakeOAuthHttpClient { error("should not be called") }
        val (service, secretRepository, tokenRepository) = buildService(httpClient)
        secretRepository.save(secret)
        tokenRepository.save(OAuthToken(secret.id, cipher.encrypt(userId, "cached-token"), Instant.now().plusSeconds(3600)))

        val result = service.resolveAccessToken(userId, secret.id)

        assertEquals("cached-token", result.accessToken)
        assertEquals(0, httpClient.callCount)
    }

    @Test
    fun `refreshes and persists a rotated refresh token when the cache is expired`() {
        val secret = oauthRefreshSecret("""{"refreshToken":"old-refresh","clientSecret":"shh"}""")
        val httpClient = FakeOAuthHttpClient {
            ProviderTokenResponse(accessToken = "new-access", expiresIn = 3600, refreshToken = "rotated-refresh")
        }
        val (service, secretRepository, tokenRepository) = buildService(httpClient)
        secretRepository.save(secret)
        tokenRepository.save(OAuthToken(secret.id, cipher.encrypt(userId, "stale-token"), Instant.now().minusSeconds(10)))

        val result = service.resolveAccessToken(userId, secret.id)

        assertEquals("new-access", result.accessToken)
        assertEquals(1, httpClient.callCount)
        val rotated = cipher.decrypt(userId, secretRepository.findById(secret.id)!!.valueCiphertext!!)
        assertEquals("""{"refreshToken":"rotated-refresh","clientSecret":"shh"}""", rotated)
    }

    @Test
    fun `does not rotate the secret value when the provider does not reissue a refresh token`() {
        val secret = oauthRefreshSecret("""{"refreshToken":"old-refresh"}""")
        val httpClient = FakeOAuthHttpClient { ProviderTokenResponse("new-access", 3600, null) }
        val (service, secretRepository, tokenRepository) = buildService(httpClient)
        secretRepository.save(secret)
        tokenRepository.save(OAuthToken(secret.id, cipher.encrypt(userId, "stale-token"), Instant.now().minusSeconds(10)))

        service.resolveAccessToken(userId, secret.id)

        val stillOriginal = cipher.decrypt(userId, secretRepository.findById(secret.id)!!.valueCiphertext!!)
        assertEquals("""{"refreshToken":"old-refresh"}""", stillOriginal)
    }

    @Test
    fun `uses HTTP Basic auth for providers that require it (e_g_ spotify)`() {
        val secret = Secret(
            id = UUID.randomUUID(),
            userId = userId,
            label = "spotify",
            authType = SecretAuthType.OAUTH2_REFRESH,
            metadata = mapOf("tokenUrl" to "https://accounts.spotify.com/api/token", "clientId" to "client-1"),
            connectorId = "spotify",
            valueCiphertext = cipher.encrypt(userId, """{"refreshToken":"old-refresh","clientSecret":"spotify-secret"}"""),
        )
        val httpClient = FakeOAuthHttpClient { ProviderTokenResponse("new-access", 3600, null) }
        val (service, secretRepository, _) = buildService(httpClient)
        secretRepository.save(secret)

        service.resolveAccessToken(userId, secret.id)

        assertEquals("client-1" to "spotify-secret", httpClient.lastBasicAuth)
    }

    @Test
    fun `rejects a secret whose auth type does not support OAuth2 access tokens`() {
        val secret = Secret(
            id = UUID.randomUUID(),
            userId = userId,
            label = "bearer secret",
            authType = SecretAuthType.BEARER,
            valueCiphertext = cipher.encrypt(userId, "token-value"),
        )
        val (service, secretRepository, _) = buildService(FakeOAuthHttpClient { error("should not be called") })
        secretRepository.save(secret)

        assertThrows(UnsupportedOAuthSecretException::class.java) {
            service.resolveAccessToken(userId, secret.id)
        }
    }
}
