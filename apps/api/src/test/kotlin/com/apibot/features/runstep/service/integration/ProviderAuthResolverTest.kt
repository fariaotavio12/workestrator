package com.apibot.features.runstep.service.integration

import com.apibot.features.secret.crypto.SecretCipher
import com.apibot.features.secret.crypto.SecretCryptoProperties
import com.apibot.features.secret.model.Secret
import com.apibot.features.secret.model.SecretAuthType
import com.apibot.features.secret.repository.SecretRepository
import com.apibot.features.secret.service.SecretService
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.net.http.HttpClient
import java.util.Base64
import java.util.UUID

/** In-memory fake — o projeto só tem `kotlin-test-junit5`, sem lib de mock (mesmo padrão de `OAuthTokenServiceTest`). */
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

class ProviderAuthResolverTest {
    private val cipher = SecretCipher(SecretCryptoProperties(Base64.getEncoder().encodeToString(ByteArray(32) { 3 })))
    private val userId: UUID = UUID.randomUUID()

    private fun buildResolver(): Pair<ProviderAuthResolver, FakeSecretRepository> {
        val secretRepository = FakeSecretRepository()
        val secretService = SecretService(secretRepository, cipher)
        val resolver = ProviderAuthResolver(secretService, HttpClient.newHttpClient(), ObjectMapper())
        return resolver to secretRepository
    }

    private fun oauth1Secret(
        metadata: Map<String, String>,
        value: String = """{"consumerSecret":"cs","tokenSecret":"ts"}""",
    ): Secret = Secret(
        id = UUID.randomUUID(),
        userId = userId,
        label = "fluig",
        authType = SecretAuthType.OAUTH1,
        metadata = metadata,
        valueCiphertext = cipher.encrypt(userId, value),
    )

    @Test
    fun `signRequest vem preenchido para uma credencial OAUTH1 e produz um header OAuth por chamada`() {
        val (resolver, secretRepository) = buildResolver()
        val secret = oauth1Secret(mapOf("consumerKey" to "fluig_avalia_chamados", "token" to "tok-1"))
        secretRepository.save(secret)

        val target = resolver.resolveToolAuth(
            userId,
            secret.id.toString(),
            ProviderAuthResolver.HttpAuthTarget(emptyMap(), "https://fluig.example/api/v2/requests/1/tasks"),
        )

        assertNotNull(target.signRequest, "signRequest deveria estar preenchido para OAUTH1 (D2)")
        val header = target.signRequest!!("GET", target.url)["Authorization"]
        assertNotNull(header)
        assertTrue(header!!.startsWith("OAuth "), "header deveria começar com o esquema OAuth: $header")
    }

    @Test
    fun `chaves conhecidas de metadata nao viram cabecalho fixo`() {
        val (resolver, secretRepository) = buildResolver()
        val secret = oauth1Secret(
            mapOf(
                "consumerKey" to "fluig_avalia_chamados",
                "token" to "tok-1",
                "signatureMethod" to "HMAC-SHA1",
                "realm" to "Fluig",
            ),
        )
        secretRepository.save(secret)

        val target = resolver.resolveToolAuth(
            userId,
            secret.id.toString(),
            ProviderAuthResolver.HttpAuthTarget(emptyMap(), "https://fluig.example/api/v2/requests/1/tasks"),
        )

        assertFalse("consumerKey" in target.headers, "consumerKey é chave conhecida (D4) — não deveria vazar como header fixo")
        assertFalse("token" in target.headers)
        assertFalse("signatureMethod" in target.headers)
        assertFalse("realm" in target.headers)
    }

    @Test
    fun `chave desconhecida de metadata continua virando cabecalho fixo`() {
        val (resolver, secretRepository) = buildResolver()
        val secret = oauth1Secret(mapOf("consumerKey" to "fluig_avalia_chamados", "X-Session" to "abc123"))
        secretRepository.save(secret)

        val target = resolver.resolveToolAuth(
            userId,
            secret.id.toString(),
            ProviderAuthResolver.HttpAuthTarget(emptyMap(), "https://fluig.example/api/v2/requests/1/tasks"),
        )

        assertEquals("abc123", target.headers["X-Session"])
    }

    @Test
    fun `credencial sem consumerKey falha com mensagem nomeando o campo`() {
        val (resolver, secretRepository) = buildResolver()
        val secret = oauth1Secret(metadata = emptyMap())
        secretRepository.save(secret)

        val target = ProviderAuthResolver.HttpAuthTarget(emptyMap(), "https://fluig.example/api/v2/requests/1/tasks")
        val ex = assertThrowsIllegalState { resolver.resolveToolAuth(userId, secret.id.toString(), target) }

        assertTrue(ex.message!!.contains("consumerKey"), "mensagem deveria nomear o campo faltante: ${ex.message}")
    }

    @Test
    fun `credencial usada como chave de provider de modelo nao aplica autenticacao`() {
        val (resolver, secretRepository) = buildResolver()
        val secret = oauth1Secret(mapOf("consumerKey" to "fluig_avalia_chamados"))
        secretRepository.save(secret)

        val providerAuth = resolver.resolveProviderAuth(userId, secret.id.toString())

        assertTrue(providerAuth.headers.isEmpty(), "OAUTH1 não deve aplicar header nenhum como chave de provider (D9)")
        assertEquals("", providerAuth.querySuffix)
    }

    @Test
    fun `duas chamadas de signRequest produzem assinaturas diferentes`() {
        val (resolver, secretRepository) = buildResolver()
        val secret = oauth1Secret(mapOf("consumerKey" to "fluig_avalia_chamados", "token" to "tok-1"))
        secretRepository.save(secret)

        val target = resolver.resolveToolAuth(
            userId,
            secret.id.toString(),
            ProviderAuthResolver.HttpAuthTarget(emptyMap(), "https://fluig.example/api/v2/requests/1/tasks"),
        )

        val first = target.signRequest!!("GET", target.url)["Authorization"]
        val second = target.signRequest!!("GET", target.url)["Authorization"]

        assertNotEquals(first, second, "cada chamada precisa de nonce/timestamp novos (RF6)")
    }

    private fun assertThrowsIllegalState(block: () -> Unit): IllegalStateException {
        try {
            block()
        } catch (ex: IllegalStateException) {
            return ex
        }
        throw AssertionError("esperava IllegalStateException")
    }
}
