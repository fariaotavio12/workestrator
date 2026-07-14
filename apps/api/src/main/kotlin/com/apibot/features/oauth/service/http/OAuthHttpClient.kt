package com.apibot.features.oauth.service.http

/** Resposta crua do endpoint de token de um provider OAuth2 — campos padrao do RFC 6749. */
data class ProviderTokenResponse(
    val accessToken: String,
    val expiresIn: Long?,
    val refreshToken: String?,
)

/**
 * Port pra troca de token — isolado do `RestClient` real pra `StandardTokenStrategy`/`InstagramTokenStrategy`
 * serem testaveis com um fake, sem depender de uma lib de mock (o projeto so tem `kotlin-test-junit5`).
 */
interface OAuthHttpClient {
    fun exchangeToken(
        tokenUrl: String,
        params: Map<String, String>,
        basicAuth: Pair<String, String>? = null,
        acceptJson: Boolean = false,
    ): ProviderTokenResponse

    /**
     * GET simples que devolve o mesmo shape de resposta — só o Instagram usa isto hoje
     * (`InstagramTokenStrategy`): os endpoints de troca curto->longo e self-refresh dele são GET com
     * query params, fora do padrão POST form-urlencoded do RFC 6749 que `exchangeToken` cobre.
     */
    fun fetchToken(url: String): ProviderTokenResponse
}
