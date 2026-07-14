package com.apibot.features.explore.repository

import com.apibot.features.explore.model.ExploreAssetEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface JpaExploreAssetRepository :
    JpaRepository<ExploreAssetEntity, UUID>,
    JpaSpecificationExecutor<ExploreAssetEntity>
