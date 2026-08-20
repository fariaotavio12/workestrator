package com.apibot.features.runstep.service.integration

import com.apibot.features.runstep.dto.RunStepScriptRequest
import com.apibot.features.script.model.ScriptHttpMethod
import com.apibot.features.script.model.ScriptKind
import com.apibot.features.secret.crypto.SecretCipher
import com.apibot.features.secret.crypto.SecretCryptoProperties
import com.apibot.features.secret.model.Secret
import com.apibot.features.secret.model.SecretAuthType
import com.apibot.features.secret.repository.SecretRepository
import com.apibot.features.secret.service.SecretService
import com.fasterxml.jackson.databind.ObjectMapper
import com.sun.net.httpserver.HttpServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.net.InetSocketAddress
import java.net.http.HttpClient
import java.nio.charset.StandardCharsets
import java.util.Base64
import java.util.UUID
import java.util.concurrent.CopyOnWriteArrayList

/**
 * In-memory fake — mesmo padrão de `ProviderAuthResolverTest`/`OAuthTokenServiceTest`. Nome distinto
 * do `FakeSecretRepository` de `ProviderAuthResolverTest.kt`: uma `class` top-level do Kotlin não tem
 * o nome mangled por arquivo (diferente de função/propriedade), então duas classes `private` com o
 * mesmo nome no mesmo pacote colidem de verdade no bytecode — foi exatamente o erro de compilação.
 */
private class FakeHttpToolSecretRepository : SecretRepository {
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

private data class CapturedRequest(val method: String, val path: String, val authorizationHeader: String?)

/**
 * `HttpToolRunner.executeHttpTool` é privado e chama `java.net.http.HttpClient` de verdade — não há
 * abstração para mockar (o projeto só tem `kotlin-test-junit5`, sem lib de mock, e `HttpClient` do JDK
 * não tem seam de teste como o `OAuthHttpClient` da feature `oauth`). Um servidor HTTP efêmero do
 * próprio JDK (`com.sun.net.httpserver`) é o jeito de observar de verdade o método/URL/header que saem
 * da chamada, sem inventar dependência nova.
 */
class HttpToolRunnerTest {
    private val cipher = SecretCipher(SecretCryptoProperties(Base64.getEncoder().encodeToString(ByteArray(32) { 5 })))
    private val userId: UUID = UUID.randomUUID()
    private var server: HttpServer? = null

    @AfterEach
    fun tearDown() {
        server?.stop(0)
    }

    private fun startServer(): Pair<Int, CopyOnWriteArrayList<CapturedRequest>> {
        val captured = CopyOnWriteArrayList<CapturedRequest>()
        val httpServer = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        httpServer.createContext("/") { exchange ->
            captured.add(
                CapturedRequest(
                    method = exchange.requestMethod,
                    path = exchange.requestURI.toString(),
                    authorizationHeader = exchange.requestHeaders.getFirst("Authorization"),
                ),
            )
            val body = "{\"ok\":true}".toByteArray(StandardCharsets.UTF_8)
            exchange.sendResponseHeaders(200, body.size.toLong())
            exchange.responseBody.use { it.write(body) }
        }
        httpServer.start()
        server = httpServer
        return httpServer.address.port to captured
    }

    private fun buildRunner(): Pair<HttpToolRunner, FakeHttpToolSecretRepository> {
        val secretRepository = FakeHttpToolSecretRepository()
        val secretService = SecretService(secretRepository, cipher)
        val objectMapper = ObjectMapper()
        val resolver = ProviderAuthResolver(secretService, HttpClient.newHttpClient(), objectMapper)
        val runner = HttpToolRunner(resolver, HttpClient.newHttpClient(), objectMapper)
        return runner to secretRepository
    }

    private fun oauth1Secret(): Secret = Secret(
        id = UUID.randomUUID(),
        userId = userId,
        label = "fluig",
        authType = SecretAuthType.OAUTH1,
        metadata = mapOf("consumerKey" to "fluig_avalia_chamados", "token" to "tok-1"),
        valueCiphertext = cipher.encrypt(userId, """{"consumerSecret":"cs","tokenSecret":"ts"}"""),
    )

    @Test
    fun `duas chamadas da mesma ferramenta produzem Authorization diferentes`() {
        val (port, captured) = startServer()
        val (runner, secretRepository) = buildRunner()
        val secret = oauth1Secret()
        secretRepository.save(secret)

        val script = RunStepScriptRequest(
            name = "consultar_tarefas",
            kind = ScriptKind.HTTP,
            method = ScriptHttpMethod.GET,
            urlTemplate = "http://127.0.0.1:$port/requests/{{id}}/tasks",
            authRef = secret.id.toString(),
        )
        val tool = runner.resolveTools(userId, listOf(script)).single()

        val first = tool.execute(mapOf("variables" to mapOf("id" to "230598")))
        val second = tool.execute(mapOf("variables" to mapOf("id" to "230598")))

        assertTrue(first.ok, first.text)
        assertTrue(second.ok, second.text)
        assertEquals(2, captured.size)
        assertNotNull(captured[0].authorizationHeader)
        assertNotNull(captured[1].authorizationHeader)
        assertNotEquals(
            captured[0].authorizationHeader,
            captured[1].authorizationHeader,
            "cada chamada precisa assinar de novo, com nonce/timestamp próprios (critério 4)",
        )
    }

    @Test
    fun `a assinatura cobre a URL com os placeholders ja substituidos`() {
        val (port, captured) = startServer()
        val (runner, secretRepository) = buildRunner()
        val secret = oauth1Secret()
        secretRepository.save(secret)

        val script = RunStepScriptRequest(
            name = "consultar_tarefas",
            kind = ScriptKind.HTTP,
            method = ScriptHttpMethod.GET,
            urlTemplate = "http://127.0.0.1:$port/requests/{{id}}/tasks",
            authRef = secret.id.toString(),
        )
        val tool = runner.resolveTools(userId, listOf(script)).single()

        val result = tool.execute(mapOf("variables" to mapOf("id" to "230598")))

        assertTrue(result.ok, result.text)
        assertEquals("/requests/230598/tasks", captured.single().path)
    }
}
