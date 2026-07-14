package com.apibot.features.explore.controller

import com.apibot.features.explore.FakeExploreAssetRepository
import com.apibot.features.explore.model.ExploreAssetKind
import com.apibot.features.explore.service.ExploreService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ExploreControllerTest {
    private val controller = ExploreController(ExploreService(FakeExploreAssetRepository()).also { it.seedInitialCatalog() })

    @Test
    fun `normalizes pagination at controller boundary`() {
        val response = controller.listAssets(page = -10, size = 500, type = null, search = null)

        assertEquals(200, response.statusCode.value())
        assertEquals(0, response.body!!.page)
        assertEquals(50, response.body!!.size)
    }

    @Test
    fun `returns paginated public assets filtered by type`() {
        val response = controller.listAssets(page = 0, size = 20, type = ExploreAssetKind.MCP, search = null)

        assertEquals(200, response.statusCode.value())
        assertEquals(1, response.body!!.data.size)
        assertTrue(response.body!!.data.first().title.contains("MCP"))
    }
}
