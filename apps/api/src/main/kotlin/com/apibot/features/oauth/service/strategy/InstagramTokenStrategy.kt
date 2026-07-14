package com.apibot.features.oauth.service.strategy

import com.apibot.features.oauth.domain.exception.OAuthTokenExchangeException
import com.apibot.features.oauth.service.http.OAuthHttpClient
import com.apibot.features.oauth.service.http.ProviderTokenResponse
import com.apibot.shared.extensions.sharedJsonMapper
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import org.springframework.stereotype.Component
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.Instant

@JsonIgnoreProperties(ignoreUnknown = true)
private data class InstagramSecretValue(val refreshToken: String? = null, val clientSecret: String? = null)

private const val INSTAGRAM_REFRESH_URL = "https://graph.instagram.com/refresh_access_token"
private const val INSTAGRAM_EXCHANGE_URL = "https://graph.instagram.com/access_token"

/** Instagram devolve o token bom por 60 dias mas nao manda `expires_in` de forma confiavel em todo caso — usa isso como piso. */
private const val DEFAULT_LONG_LIVED_TTL_SECONDS = 5_184_000L // 60 dias

/**
 * Instagram não usa o grant_type=refresh_token do RFC 6749 — o ciclo é próprio (ver
 * docs/plano-oauth-backend-token-lifecycle.md §6 no repo front):
 *
 *  1) authorization_code -> token curto (1h) — feito pelo `oauth-flow.ts` no Electron (o fluxo
 *     genérico de PKCE já funciona pra essa etapa; o Instagram só não devolve `refresh_token` nela).
 *  2) token curto -> token longo (60d): `GET .../access_token?grant_type=ig_exchange_token`.
 *  3) "self-refresh" do token longo: `GET .../refresh_access_token?grant_type=ig_refresh_token`.
 *
 * O "refresh token" que guardamos no secret é, na prática, o próprio access token de longa duração —
 * não existe um par access/refresh separado como no OAuth2 padrão, e é ele mesmo que o runner usa
 * pra chamar a Graph API (`?access_token=...`). Por isso a estratégia tenta o self-refresh primeiro
 * (assume que o valor guardado já é o token longo); se falhar, tenta a troca curto->longo (assume que
 * o valor ainda é o token curto de 1h vindo direto do connect) — evita rastrear um estado extra só
 * pra saber qual dos dois o secret guarda no momento.
 */
@Component
class InstagramTokenStrategy(
    private val httpClient: OAuthHttpClient,
) : TokenStrategy {
    override val id = "instagram"

    override fun exchange(context: TokenExchangeContext): TokenExchangeResult {
        val parsed = runCatching { sharedJsonMapper.readValue(context.secretValue, InstagramSecretValue::class.java) }
            .getOrElse { InstagramSecretValue(refreshToken = context.secretValue) }
        val currentToken = parsed.refreshToken ?: context.secretValue
        val clientSecret = parsed.clientSecret
            ?: throw OAuthTokenExchangeException("Instagram precisa do client secret pra trocar/renovar o token")

        val response = runCatching { selfRefresh(currentToken) }
            .getOrElse { exchangeShortForLong(currentToken, clientSecret) }

        val rotatedValue = sharedJsonMapper.writeValueAsString(
            InstagramSecretValue(refreshToken = response.accessToken, clientSecret = clientSecret),
        )

        return TokenExchangeResult(
            accessToken = response.accessToken,
            expiresAt = Instant.now().plusSeconds(response.expiresIn ?: DEFAULT_LONG_LIVED_TTL_SECONDS),
            rotatedSecretValue = rotatedValue,
        )
    }

    private fun selfRefresh(longLivedToken: String): ProviderTokenResponse =
        httpClient.fetchToken("$INSTAGRAM_REFRESH_URL?grant_type=ig_refresh_token&access_token=${encode(longLivedToken)}")

    private fun exchangeShortForLong(shortLivedToken: String, clientSecret: String): ProviderTokenResponse =
        httpClient.fetchToken(
            "$INSTAGRAM_EXCHANGE_URL?grant_type=ig_exchange_token" +
                "&client_secret=${encode(clientSecret)}&access_token=${encode(shortLivedToken)}",
        )

    private fun encode(value: String): String = URLEncoder.encode(value, StandardCharsets.UTF_8)
}
