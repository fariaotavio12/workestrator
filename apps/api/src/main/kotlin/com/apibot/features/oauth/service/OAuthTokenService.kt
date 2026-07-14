package com.apibot.features.oauth.service

import com.apibot.features.oauth.catalog.OAuthProviderCatalog
import com.apibot.features.oauth.domain.exception.UnsupportedOAuthSecretException
import com.apibot.features.oauth.dto.AccessTokenResponse
import com.apibot.features.oauth.model.OAuthToken
import com.apibot.features.oauth.repository.OAuthTokenRepository
import com.apibot.features.oauth.service.strategy.TokenExchangeContext
import com.apibot.features.oauth.service.strategy.TokenStrategy
import com.apibot.features.secret.crypto.SecretCipher
import com.apibot.features.secret.dto.UpdateSecretValueRequest
import com.apibot.features.secret.model.SecretAuthType
import com.apibot.features.secret.service.SecretService
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

/** Margem antes do vencimento "real" — evita devolver um token que expira no meio de uma chamada do runner. */
private const val EXPIRY_SAFETY_MARGIN_SECONDS = 60L

/**
 * Dono do ciclo de vida do token OAuth2: cache, refresh e rotacao do refresh token — ver
 * docs/plano-oauth-backend-token-lifecycle.md (front `docs/`). Espelha o que `exchangeOAuth2Token`
 * fazia no runner Electron; a diferenca e que agora sobrevive a restart (cache em tabela, nao em
 * `Map` em memoria) e nenhum cliente precisa saber tocar um refresh token.
 */
@Service
class OAuthTokenService(
    private val secretService: SecretService,
    private val oAuthTokenRepository: OAuthTokenRepository,
    private val secretCipher: SecretCipher,
    strategies: List<TokenStrategy>,
) {
    private val strategiesById = strategies.associateBy { it.id }
    private val standardStrategy = requireNotNull(strategiesById["standard"]) { "StandardTokenStrategy nao registrada" }

    fun resolveAccessToken(userId: UUID, secretId: UUID): AccessTokenResponse {
        val secret = secretService.getSecretForUser(userId, secretId)
        if (secret.authType != SecretAuthType.OAUTH2_REFRESH && secret.authType != SecretAuthType.OAUTH2_CLIENT_CREDENTIALS) {
            throw UnsupportedOAuthSecretException()
        }

        val now = Instant.now()
        val cached = oAuthTokenRepository.findBySecretId(secretId)
        if (cached != null && cached.expiresAt.isAfter(now.plusSeconds(EXPIRY_SAFETY_MARGIN_SECONDS))) {
            return AccessTokenResponse(secretCipher.decrypt(userId, cached.accessTokenCiphertext), cached.expiresAt)
        }

        val resolved = secretService.resolveValue(userId, secretId)
        val provider = secret.connectorId?.let { OAuthProviderCatalog.findById(it) }
        val strategy = provider?.strategy?.let { strategiesById[it] } ?: standardStrategy

        val result = strategy.exchange(
            TokenExchangeContext(
                provider = provider,
                authType = resolved.authType,
                secretValue = resolved.value,
                metadata = resolved.metadata ?: emptyMap(),
            ),
        )

        oAuthTokenRepository.save(
            OAuthToken(
                secretId = secretId,
                accessTokenCiphertext = secretCipher.encrypt(userId, result.accessToken),
                expiresAt = result.expiresAt,
            ),
        )

        if (result.rotatedSecretValue != null) {
            secretService.updateSecretValue(userId, secretId, UpdateSecretValueRequest(result.rotatedSecretValue))
        }

        return AccessTokenResponse(result.accessToken, result.expiresAt)
    }
}
