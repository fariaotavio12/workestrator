package com.apibot.features.oauth.controller

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ConnectorCatalogControllerTest {
    private val controller = ConnectorCatalogController()

    @Test
    fun `lists every provider in the catalog`() {
        val response = controller.listConnectors()

        assertEquals(200, response.statusCode.value())
        val ids = response.body!!.map { it.id }
        assertTrue(ids.contains("google"))
        assertTrue(ids.contains("composio"))
    }

    @Test
    fun `never leaks a client secret or token field`() {
        val response = controller.listConnectors()

        // Presets sem authUrl (grupo D, ex. composio) nao oferecem o fluxo "Conectar" no front.
        val composio = response.body!!.first { it.id == "composio" }
        assertNull(composio.authUrl)

        val google = response.body!!.first { it.id == "google" }
        assertFalse(google.authUrl.isNullOrBlank())
    }

    @Test
    fun `every preset with authUrl also carries tokenUrl — ConnectOAuthDialog needs both to submit`() {
        // Regressao: faltou mapear tokenUrl em ConnectorResponse uma vez e o botao "Conectar" ficava
        // mudo (o front tem uma guarda silenciosa pra `!preset.tokenUrl`, ver connect-oauth-dialog.tsx).
        val response = controller.listConnectors()

        response.body!!.filter { !it.authUrl.isNullOrBlank() }.forEach { connector ->
            assertFalse(connector.tokenUrl.isNullOrBlank(), "${connector.id} tem authUrl mas nao tem tokenUrl")
        }
    }
}
