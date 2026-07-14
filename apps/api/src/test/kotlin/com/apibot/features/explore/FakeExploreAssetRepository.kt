package com.apibot.features.explore

import com.apibot.features.explore.model.ExploreAsset
import com.apibot.features.explore.model.ExploreAssetKind
import com.apibot.features.explore.model.ExploreAssetVisibility
import com.apibot.features.explore.repository.ExploreAssetRepository
import com.apibot.shared.extensions.PageRequestParams
import com.apibot.shared.extensions.PageResult
import java.util.UUID

class FakeExploreAssetRepository : ExploreAssetRepository {
    private val assets = linkedMapOf<UUID, ExploreAsset>()

    override fun save(asset: ExploreAsset): ExploreAsset {
        assets[asset.id] = asset
        return asset
    }

    override fun update(asset: ExploreAsset): ExploreAsset = save(asset)

    override fun findById(id: UUID): ExploreAsset? = assets[id]

    override fun existsById(id: UUID): Boolean = assets.containsKey(id)

    override fun listPublic(
        params: PageRequestParams,
        kind: ExploreAssetKind?,
        search: String?,
    ): PageResult<ExploreAsset> {
        val normalizedSearch = search?.trim()?.lowercase().orEmpty()
        val filtered = assets.values
            .filter { it.visibility == ExploreAssetVisibility.PUBLIC }
            .filter { kind == null || it.kind == kind }
            .filter {
                normalizedSearch.isBlank() ||
                    it.title.lowercase().contains(normalizedSearch) ||
                    it.description.lowercase().contains(normalizedSearch) ||
                    it.tags.any { tag -> tag.lowercase().contains(normalizedSearch) }
            }
            .sortedWith(compareByDescending<ExploreAsset> { it.isVerified }.thenByDescending { it.importCount })

        return filtered.toPage(params)
    }

    override fun listByOwner(userId: UUID, params: PageRequestParams): PageResult<ExploreAsset> =
        assets.values.filter { it.ownerUserId == userId }.toPage(params)

    private fun List<ExploreAsset>.toPage(params: PageRequestParams): PageResult<ExploreAsset> {
        val from = (params.page * params.size).coerceAtMost(size)
        val to = (from + params.size).coerceAtMost(size)
        val totalPages = if (isEmpty()) 0 else ((size - 1) / params.size) + 1

        return PageResult(
            data = subList(from, to),
            page = params.page,
            size = params.size,
            totalElements = size.toLong(),
            totalPages = totalPages,
            hasNext = params.page + 1 < totalPages,
            hasPrevious = params.page > 0 && totalPages > 0,
        )
    }
}
