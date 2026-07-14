package com.apibot.features.explore.repository

import com.apibot.features.explore.model.ExploreAsset
import com.apibot.features.explore.model.ExploreAssetKind
import com.apibot.shared.extensions.PageRequestParams
import com.apibot.shared.extensions.PageResult
import java.util.UUID

interface ExploreAssetRepository {
    fun save(asset: ExploreAsset): ExploreAsset
    fun update(asset: ExploreAsset): ExploreAsset
    fun findById(id: UUID): ExploreAsset?
    fun existsById(id: UUID): Boolean
    fun listPublic(params: PageRequestParams, kind: ExploreAssetKind?, search: String?): PageResult<ExploreAsset>
    fun listByOwner(userId: UUID, params: PageRequestParams): PageResult<ExploreAsset>
}
