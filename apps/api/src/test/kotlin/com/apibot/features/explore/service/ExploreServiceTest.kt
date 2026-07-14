package com.apibot.features.explore.service

import com.apibot.features.explore.FakeExploreAssetRepository
import com.apibot.features.explore.model.ExploreAssetKind
import com.apibot.features.explore.model.ExploreAssetVisibility
import com.apibot.shared.extensions.PageRequestParams
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.UUID

class ExploreServiceTest {
    private val repository = FakeExploreAssetRepository()
    private val service = ExploreService(repository).also { it.seedInitialCatalog() }

    @Test
    fun `lists assets with project pagination shape`() {
        val result = service.listAssets(PageRequestParams(page = 0, size = 2), kind = null, search = null)

        assertEquals(2, result.data.size)
        assertEquals(0, result.page)
        assertEquals(2, result.size)
        assertEquals(6, result.totalElements)
        assertEquals(3, result.totalPages)
        assertTrue(result.hasNext)
        assertFalse(result.hasPrevious)
    }

    @Test
    fun `filters assets by kind`() {
        val result = service.listAssets(PageRequestParams(page = 0, size = 20), kind = ExploreAssetKind.SKILL, search = null)

        assertEquals(1, result.data.size)
        assertEquals(ExploreAssetKind.SKILL, result.data.first().kind)
    }

    @Test
    fun `searches title description and tags`() {
        val result = service.listAssets(PageRequestParams(page = 0, size = 20), kind = null, search = "frontend")

        assertEquals(1, result.data.size)
        assertEquals("Frontend Quality Check", result.data.first().title)
    }

    @Test
    fun `imports public asset as private copy`() {
        val source = service.listAssets(PageRequestParams(page = 0, size = 1), kind = ExploreAssetKind.SKILL, search = null)
            .data
            .first()

        val imported = service.importAsset(UUID.randomUUID(), source.id)

        assertEquals(source.id, imported.sourceAssetId)
        assertEquals(ExploreAssetVisibility.PRIVATE, imported.visibility)
    }
}
