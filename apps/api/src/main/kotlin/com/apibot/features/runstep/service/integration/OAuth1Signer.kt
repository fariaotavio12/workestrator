package com.apibot.features.runstep.service.integration

import java.net.URI
import java.net.URLDecoder
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import java.time.Instant
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Assinatura OAuth 1.0a (RFC 5849) — o `Authorization: OAuth ...` de APIs legadas que nunca migraram
 * pra OAuth2 (Fluig/TOTVS, Twitter v1.1, WooCommerce sobre http, Netsuite...).
 *
 * Diferente dos outros esquemas de `SecretAuthType`, o header **não pode ser calculado uma vez e
 * reaproveitado**: a assinatura cobre método + URL final + nonce + timestamp, então cada requisição
 * precisa de um header novo. Daí `ProviderAuthResolver.HttpAuthTarget.signRequest` ser um callback
 * chamado no momento da chamada, e não um header fixo.
 *
 * Espelhado em JS por `apps/web/electron/mcp-servers/oauth1.mjs` (o runner do Electron e o
 * `http-tool.mjs` assinam no processo deles).
 */
object OAuth1Signer {
    private const val VERSION = "1.0"
    private val nonceAlphabet = ('a'..'z') + ('A'..'Z') + ('0'..'9')
    private val random = SecureRandom()

    data class Credentials(
        val consumerKey: String,
        val consumerSecret: String,
        val token: String? = null,
        val tokenSecret: String? = null,
        val signatureMethod: String = "HMAC-SHA1",
        val realm: String? = null,
    )

    /**
     * `additionalParams` são os parâmetros de um corpo `application/x-www-form-urlencoded`, que a RFC
     * manda entrar na assinatura (§3.4.1.3.1). Corpo JSON — o que as tools `kind: http` mandam — fica
     * fora da base string, então os executores passam vazio.
     */
    fun authorizationHeader(
        method: String,
        url: String,
        credentials: Credentials,
        additionalParams: Map<String, String> = emptyMap(),
        nonce: String = randomNonce(),
        timestamp: Long = Instant.now().epochSecond,
    ): String {
        val oauthParams = buildOAuthParams(credentials, nonce, timestamp)
        val baseString = signatureBaseString(method, url, oauthParams + additionalParams)
        val signature = sign(credentials, baseString)

        val entries = buildList {
            credentials.realm?.takeIf { it.isNotBlank() }?.let { add("realm" to it) }
            add("oauth_consumer_key" to credentials.consumerKey)
            credentials.token?.takeIf { it.isNotBlank() }?.let { add("oauth_token" to it) }
            add("oauth_signature_method" to normalizedMethod(credentials.signatureMethod))
            add("oauth_timestamp" to timestamp.toString())
            add("oauth_nonce" to nonce)
            add("oauth_version" to VERSION)
            add("oauth_signature" to signature)
        }
        return entries.joinToString(",", prefix = "OAuth ") { (key, value) -> "$key=\"${encode(value)}\"" }
    }

    /** Exposto pro teste: é aqui que mora a parte difícil da RFC (normalização de URL e de parâmetros). */
    fun signatureBaseString(method: String, url: String, params: Map<String, String>): String {
        val uri = URI(url)
        val normalizedParams = (params.entries.map { it.key to it.value } + queryParams(uri.rawQuery))
            .map { (key, value) -> encode(key) to encode(value) }
            .sortedWith(compareBy({ it.first }, { it.second }))
            .joinToString("&") { (key, value) -> "$key=$value" }
        return "${method.uppercase()}&${encode(baseStringUri(uri))}&${encode(normalizedParams)}"
    }

    private fun buildOAuthParams(credentials: Credentials, nonce: String, timestamp: Long): Map<String, String> =
        buildMap {
            put("oauth_consumer_key", credentials.consumerKey)
            put("oauth_nonce", nonce)
            put("oauth_signature_method", normalizedMethod(credentials.signatureMethod))
            put("oauth_timestamp", timestamp.toString())
            put("oauth_version", VERSION)
            credentials.token?.takeIf { it.isNotBlank() }?.let { put("oauth_token", it) }
        }

    /** `scheme://host[:porta]/path` — sem query, sem fragment, porta default omitida (§3.4.1.2). */
    private fun baseStringUri(uri: URI): String {
        val scheme = (uri.scheme ?: "http").lowercase()
        val host = (uri.host ?: "").lowercase()
        val isDefaultPort = uri.port == -1 ||
            (scheme == "http" && uri.port == 80) ||
            (scheme == "https" && uri.port == 443)
        val port = if (isDefaultPort) "" else ":${uri.port}"
        val path = uri.rawPath?.takeIf { it.isNotBlank() } ?: "/"
        return "$scheme://$host$port$path"
    }

    /** Os parâmetros da query entram na assinatura decodificados — a base string reencoda tudo. */
    private fun queryParams(rawQuery: String?): List<Pair<String, String>> =
        rawQuery?.takeIf { it.isNotBlank() }
            ?.split("&")
            ?.filter { it.isNotBlank() }
            ?.map { pair ->
                val index = pair.indexOf('=')
                if (index < 0) decode(pair) to "" else decode(pair.take(index)) to decode(pair.substring(index + 1))
            }
            ?: emptyList()

    private fun sign(credentials: Credentials, baseString: String): String {
        val signingKey = "${encode(credentials.consumerSecret)}&${encode(credentials.tokenSecret ?: "")}"
        return when (val method = normalizedMethod(credentials.signatureMethod)) {
            "PLAINTEXT" -> signingKey
            else -> {
                val algorithm = if (method == "HMAC-SHA256") "HmacSHA256" else "HmacSHA1"
                val mac = Mac.getInstance(algorithm)
                mac.init(SecretKeySpec(signingKey.toByteArray(StandardCharsets.UTF_8), algorithm))
                Base64.getEncoder().encodeToString(mac.doFinal(baseString.toByteArray(StandardCharsets.UTF_8)))
            }
        }
    }

    private fun normalizedMethod(raw: String): String =
        when (raw.trim().uppercase()) {
            "HMAC-SHA256", "HMACSHA256", "SHA256" -> "HMAC-SHA256"
            "PLAINTEXT" -> "PLAINTEXT"
            else -> "HMAC-SHA1"
        }

    /** `URLEncoder` faz form-encoding, não RFC 3986 — os três ajustes abaixo cobrem a diferença. */
    private fun encode(value: String): String =
        URLEncoder.encode(value, StandardCharsets.UTF_8)
            .replace("+", "%20")
            .replace("*", "%2A")
            .replace("%7E", "~")

    private fun decode(value: String): String = URLDecoder.decode(value, StandardCharsets.UTF_8)

    private fun randomNonce(): String =
        (1..11).map { nonceAlphabet[random.nextInt(nonceAlphabet.size)] }.joinToString("")
}
