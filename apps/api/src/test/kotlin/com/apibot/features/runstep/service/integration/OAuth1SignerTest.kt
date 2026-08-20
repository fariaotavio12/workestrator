package com.apibot.features.runstep.service.integration

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.nio.charset.StandardCharsets
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

class OAuth1SignerTest {
    private fun headerParams(header: String): Map<String, String> {
        assertTrue(header.startsWith("OAuth "), "header deveria começar com o esquema OAuth: $header")
        return header.removePrefix("OAuth ")
            .split(",")
            .associate { entry ->
                val (key, value) = entry.split("=", limit = 2)
                key.trim() to value.trim().trim('"')
            }
    }

    private fun hmacSha1(key: String, data: String): String {
        val mac = Mac.getInstance("HmacSHA1")
        mac.init(SecretKeySpec(key.toByteArray(StandardCharsets.UTF_8), "HmacSHA1"))
        return Base64.getEncoder().encodeToString(mac.doFinal(data.toByteArray(StandardCharsets.UTF_8)))
    }

    @Test
    fun `base string segue o exemplo da RFC 5849`() {
        val baseString = OAuth1Signer.signatureBaseString(
            method = "POST",
            url = "http://example.com/request?b5=%3D%253D&a3=a&c%40=&a2=r%20b",
            params = mapOf(
                "oauth_consumer_key" to "9djdj82h48djs9d2",
                "oauth_token" to "kkk9d7dh3k39sjv7",
                "oauth_signature_method" to "HMAC-SHA1",
                "oauth_timestamp" to "137131201",
                "oauth_nonce" to "7d8f3e4a",
                "c2" to "",
                "a3" to "2 q",
            ),
        )

        assertEquals(
            "POST&http%3A%2F%2Fexample.com%2Frequest&a2%3Dr%2520b%26a3%3D2%2520q%26a3%3Da%26b5%3D%253D%25253D" +
                "%26c%2540%3D%26c2%3D%26oauth_consumer_key%3D9djdj82h48djs9d2%26oauth_nonce%3D7d8f3e4a" +
                "%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D137131201%26oauth_token%3Dkkk9d7dh3k39sjv7",
            baseString,
        )
    }

    @Test
    fun `porta nao default entra na base string e a query fica fora da url`() {
        val baseString = OAuth1Signer.signatureBaseString(
            method = "post",
            url = "HTTP://187.72.197.247:8073/process-management/api/v2/requests/230598/move?draft=false",
            params = mapOf("oauth_nonce" to "abc"),
        )

        assertEquals(
            "POST&http%3A%2F%2F187.72.197.247%3A8073%2Fprocess-management%2Fapi%2Fv2%2Frequests%2F230598%2Fmove" +
                "&draft%3Dfalse%26oauth_nonce%3Dabc",
            baseString,
        )
    }

    @Test
    fun `header carrega os parametros oauth e a assinatura hmac-sha1 da base string`() {
        val credentials = OAuth1Signer.Credentials(
            consumerKey = "fluig_avalia_chamados",
            consumerSecret = "consumer-secret",
            token = "843be26f-950d-4e76-9445-16abef73f22e",
            tokenSecret = "token-secret",
        )
        val url = "http://187.72.197.247:8073/process-management/api/v2/requests/230598/move"

        val params = headerParams(
            OAuth1Signer.authorizationHeader(
                method = "POST",
                url = url,
                credentials = credentials,
                nonce = "OSAwERFOfov",
                timestamp = 1787168122L,
            ),
        )

        assertEquals("fluig_avalia_chamados", params["oauth_consumer_key"])
        assertEquals("843be26f-950d-4e76-9445-16abef73f22e", params["oauth_token"])
        assertEquals("HMAC-SHA1", params["oauth_signature_method"])
        assertEquals("1787168122", params["oauth_timestamp"])
        assertEquals("OSAwERFOfov", params["oauth_nonce"])
        assertEquals("1.0", params["oauth_version"])

        val expectedBaseString = OAuth1Signer.signatureBaseString(
            method = "POST",
            url = url,
            params = mapOf(
                "oauth_consumer_key" to credentials.consumerKey,
                "oauth_token" to credentials.token!!,
                "oauth_signature_method" to "HMAC-SHA1",
                "oauth_timestamp" to "1787168122",
                "oauth_nonce" to "OSAwERFOfov",
                "oauth_version" to "1.0",
            ),
        )
        val expectedSignature = hmacSha1("consumer-secret&token-secret", expectedBaseString)
        // O header carrega a assinatura percent-encoded (`=` do base64 vira `%3D`).
        assertEquals(expectedSignature, java.net.URLDecoder.decode(params.getValue("oauth_signature"), StandardCharsets.UTF_8))
    }

    @Test
    fun `sem token o header omite oauth_token e assina so com o consumer secret`() {
        val header = OAuth1Signer.authorizationHeader(
            method = "GET",
            url = "https://example.com/api",
            credentials = OAuth1Signer.Credentials(consumerKey = "ck", consumerSecret = "cs"),
            nonce = "nonce123456",
            timestamp = 1L,
        )
        val params = headerParams(header)

        assertTrue("oauth_token" !in params, "não deveria mandar oauth_token: $header")
        val baseString = OAuth1Signer.signatureBaseString(
            method = "GET",
            url = "https://example.com/api",
            params = mapOf(
                "oauth_consumer_key" to "ck",
                "oauth_signature_method" to "HMAC-SHA1",
                "oauth_timestamp" to "1",
                "oauth_nonce" to "nonce123456",
                "oauth_version" to "1.0",
            ),
        )
        assertEquals(
            hmacSha1("cs&", baseString),
            java.net.URLDecoder.decode(params.getValue("oauth_signature"), StandardCharsets.UTF_8),
        )
    }

    @Test
    fun `realm aparece no header quando configurado`() {
        val header = OAuth1Signer.authorizationHeader(
            method = "GET",
            url = "https://example.com/api",
            credentials = OAuth1Signer.Credentials(consumerKey = "ck", consumerSecret = "cs", realm = "Fluig"),
        )

        assertTrue(header.startsWith("OAuth realm=\"Fluig\","), header)
    }
}
