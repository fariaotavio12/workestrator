package com.apibot.features.oauth.service.strategy

import com.apibot.features.oauth.domain.exception.OAuthTokenExchangeException
import com.apibot.features.oauth.model.TokenAuthMethod
import com.apibot.features.oauth.service.http.OAuthHttpClient
import com.apibot.features.secret.model.SecretAuthType
import com.apibot.shared.extensions.sharedJsonMapper
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import org.springframework.stereotype.Component
import java.time.Instant

@JsonIgnoreProperties(ignoreUnknown = true)
private data class RefreshSecretValue(val refreshToken: String? = null, val clientSecret: String? = null)

@JsonIgnoreProperties(ignoreUnknown = true)
private data class ClientCredentialsSecretValue(val clientSecret: String? = null)

/**
 * Grant_type=refresh_token/client_credentials padrao (RFC 6749) — cobre os grupos A/B do catalogo.
 * Espelha o `exchangeOAuth2Token` que existia no runner Electron (`electron/runner/runner.ts`); a
 * diferenca e so onde roda — a logica (parsing do valor, rotacao do refresh token) e a mesma.
 */
@Component
class StandardTokenStrategy(
    private val httpClient: OAuthHttpClient,
) : TokenStrategy {
    override val id = "standard"

    override fun exchange(context: TokenExchangeContext): TokenExchangeResult {
        val tokenUrl = context.metadata["tokenUrl"] ?: context.provider?.tokenUrl
            ?: throw OAuthTokenExchangeException("Secret oauth2 sem tokenUrl configurado")
        val clientId = context.metadata["clientId"]
        val tokenAuthMethod = context.provider?.tokenAuthMethod ?: TokenAuthMethod.BODY

        val params = linkedMapOf<String, String>()
        val clientSecret: String?
        val previousRefreshToken: String?

        if (context.authType == SecretAuthType.OAUTH2_CLIENT_CREDENTIALS) {
            val parsed = parseClientCredentialsSecretValue(context.secretValue)
            clientSecret = parsed.clientSecret ?: context.secretValue
            previousRefreshToken = null
            params["grant_type"] = "client_credentials"
        } else {
            val parsed = parseRefreshSecretValue(context.secretValue)
            clientSecret = parsed.clientSecret
            previousRefreshToken = parsed.refreshToken ?: context.secretValue
            params["grant_type"] = "refresh_token"
            params["refresh_token"] = previousRefreshToken
        }

        clientId?.let { params["client_id"] = it }
        if (tokenAuthMethod == TokenAuthMethod.BODY) clientSecret?.let { params["client_secret"] = it }
        context.metadata["scopes"]?.let { params["scope"] = it }

        val basicAuth = if (tokenAuthMethod == TokenAuthMethod.BASIC && clientId != null && clientSecret != null) {
            clientId to clientSecret
        } else {
            null
        }

        val response = httpClient.exchangeToken(
            tokenUrl = tokenUrl,
            params = params,
            basicAuth = basicAuth,
            acceptJson = context.provider?.tokenAcceptJson ?: false,
        )

        // Muitos providers (Google, GitHub App, Notion...) reemitem um refresh_token novo a cada troca
        // e invalidam o anterior — sem persistir de volta, a proxima troca falha com o token salvo morto.
        val rotatedValue = if (
            context.authType == SecretAuthType.OAUTH2_REFRESH &&
            response.refreshToken != null &&
            response.refreshToken != previousRefreshToken
        ) {
            sharedJsonMapper.writeValueAsString(RefreshSecretValue(refreshToken = response.refreshToken, clientSecret = clientSecret))
        } else {
            null
        }

        return TokenExchangeResult(
            accessToken = response.accessToken,
            expiresAt = Instant.now().plusSeconds(response.expiresIn ?: 3600L),
            rotatedSecretValue = rotatedValue,
        )
    }

    private fun parseRefreshSecretValue(raw: String): RefreshSecretValue =
        runCatching { sharedJsonMapper.readValue(raw, RefreshSecretValue::class.java) }
            .getOrElse { RefreshSecretValue(refreshToken = raw) }

    private fun parseClientCredentialsSecretValue(raw: String): ClientCredentialsSecretValue =
        runCatching { sharedJsonMapper.readValue(raw, ClientCredentialsSecretValue::class.java) }
            .getOrElse { ClientCredentialsSecretValue(clientSecret = raw) }
}
