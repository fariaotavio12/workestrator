package com.apibot.features.oauth.service.http

import com.apibot.features.oauth.domain.exception.OAuthTokenExchangeException
import com.apibot.shared.extensions.sharedJsonMapper
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.util.LinkedMultiValueMap
import org.springframework.util.MultiValueMap
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientResponseException

@JsonIgnoreProperties(ignoreUnknown = true)
private data class TokenEndpointBody(
    @JsonProperty("access_token") val accessToken: String,
    @JsonProperty("expires_in") val expiresIn: Long? = null,
    @JsonProperty("refresh_token") val refreshToken: String? = null,
)

/** Implementacao real via `RestClient` (Spring 6, ja disponivel no starter-web — sem dependencia nova). */
@Component
class RestClientOAuthHttpClient(
    private val restClient: RestClient,
) : OAuthHttpClient {
    override fun exchangeToken(
        tokenUrl: String,
        params: Map<String, String>,
        basicAuth: Pair<String, String>?,
        acceptJson: Boolean,
    ): ProviderTokenResponse {
        val body: MultiValueMap<String, String> = LinkedMultiValueMap()
        params.forEach { (key, value) -> body.add(key, value) }

        val raw = requestBody(tokenUrl) {
            restClient.post()
                .uri(tokenUrl)
                .headers { headers ->
                    headers.contentType = MediaType.APPLICATION_FORM_URLENCODED
                    if (acceptJson) headers.accept = listOf(MediaType.APPLICATION_JSON)
                    if (basicAuth != null) headers.setBasicAuth(basicAuth.first, basicAuth.second)
                }
                .body(body)
                .retrieve()
                .body(String::class.java)
        }

        return parseResponse(raw, tokenUrl)
    }

    override fun fetchToken(url: String): ProviderTokenResponse {
        val raw = requestBody(url) { restClient.get().uri(url).retrieve().body(String::class.java) }
        return parseResponse(raw, url)
    }

    private fun requestBody(url: String, call: () -> String?): String = try {
        call() ?: throw OAuthTokenExchangeException("Token endpoint nao retornou corpo (${url})")
    } catch (exception: RestClientResponseException) {
        throw OAuthTokenExchangeException("Chamada ao provider falhou (HTTP ${exception.statusCode.value()} em ${url})")
    }

    private fun parseResponse(raw: String, url: String): ProviderTokenResponse {
        val parsed = try {
            sharedJsonMapper.readValue(raw, TokenEndpointBody::class.java)
        } catch (exception: Exception) {
            throw OAuthTokenExchangeException("Resposta em formato inesperado (${url})")
        }
        return ProviderTokenResponse(parsed.accessToken, parsed.expiresIn, parsed.refreshToken)
    }
}
