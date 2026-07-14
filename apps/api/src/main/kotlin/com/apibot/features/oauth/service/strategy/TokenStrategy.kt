package com.apibot.features.oauth.service.strategy

import com.apibot.features.oauth.model.OAuthProvider
import com.apibot.features.secret.model.SecretAuthType
import java.time.Instant

data class TokenExchangeContext(
    /** null quando o secret nao esta linkado a nenhum preset do catalogo (`Secret.connectorId` nulo — secret manual). */
    val provider: OAuthProvider?,
    val authType: SecretAuthType,
    /** Valor decriptografado do secret (JSON `{refreshToken, clientSecret}` ou `{clientSecret}`, ou string crua). */
    val secretValue: String,
    /** `tokenUrl`/`clientId`/`scopes` do secret — usado como fallback quando `provider` e nulo. */
    val metadata: Map<String, String>,
)

data class TokenExchangeResult(
    val accessToken: String,
    val expiresAt: Instant,
    /** Novo valor JSON a persistir no secret (refresh token rotacionado) — null = nao rotacionou. */
    val rotatedSecretValue: String? = null,
)

/**
 * Estrategia de renovacao do access token de um provider. `"standard"` cobre o grant_type
 * refresh_token/client_credentials do RFC 6749 (grupos A/B do catalogo); providers fora do padrao
 * (Instagram) tem a propria — ver docs/plano-oauth-backend-token-lifecycle.md no front.
 */
interface TokenStrategy {
    val id: String
    fun exchange(context: TokenExchangeContext): TokenExchangeResult
}
