package com.apibot.features.oauth.service.strategy

import com.apibot.features.oauth.service.http.OAuthHttpClient
import com.apibot.features.oauth.service.http.ProviderTokenResponse
import com.apibot.features.secret.model.SecretAuthType
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private class FakeInstagramHttpClient(
    private val onFetch: (url: String) -> ProviderTokenResponse,
) : OAuthHttpClient {
    val fetchedUrls = mutableListOf<String>()

    override fun exchangeToken(
        tokenUrl: String,
        params: Map<String, String>,
        basicAuth: Pair<String, String>?,
        acceptJson: Boolean,
    ): ProviderTokenResponse = error("Instagram nunca usa exchangeToken (POST form) — só fetchToken (GET)")

    override fun fetchToken(url: String): ProviderTokenResponse {
        fetchedUrls.add(url)
        return onFetch(url)
    }
}

class InstagramTokenStrategyTest {
    private fun context(secretValue: String) = TokenExchangeContext(
        provider = null,
        authType = SecretAuthType.OAUTH2_REFRESH,
        secretValue = secretValue,
        metadata = emptyMap(),
    )

    @Test
    fun `self-refreshes when the stored value is already a long-lived token`() {
        val httpClient = FakeInstagramHttpClient { url ->
            assertTrue(url.contains("ig_refresh_token"))
            ProviderTokenResponse(accessToken = "refreshed-long-token", expiresIn = 5_184_000, refreshToken = null)
        }
        val strategy = InstagramTokenStrategy(httpClient)

        val result = strategy.exchange(context("""{"refreshToken":"current-long-token","clientSecret":"app-secret"}"""))

        assertEquals("refreshed-long-token", result.accessToken)
        assertEquals(1, httpClient.fetchedUrls.size)
        assertEquals("""{"refreshToken":"refreshed-long-token","clientSecret":"app-secret"}""", result.rotatedSecretValue)
    }

    @Test
    fun `falls back to exchanging a short-lived token for a long-lived one when self-refresh fails`() {
        val httpClient = FakeInstagramHttpClient { url ->
            if (url.contains("ig_refresh_token")) error("simulated failure — token is still short-lived")
            assertTrue(url.contains("ig_exchange_token"))
            ProviderTokenResponse(accessToken = "new-long-token", expiresIn = 5_184_000, refreshToken = null)
        }
        val strategy = InstagramTokenStrategy(httpClient)

        val result = strategy.exchange(context("""{"refreshToken":"short-lived-token","clientSecret":"app-secret"}"""))

        assertEquals("new-long-token", result.accessToken)
        assertEquals(2, httpClient.fetchedUrls.size)
        assertTrue(httpClient.fetchedUrls[0].contains("ig_refresh_token"))
        assertTrue(httpClient.fetchedUrls[1].contains("ig_exchange_token"))
    }
}
