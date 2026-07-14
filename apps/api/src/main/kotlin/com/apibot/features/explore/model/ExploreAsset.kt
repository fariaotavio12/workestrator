package com.apibot.features.explore.model

import com.apibot.features.explore.dto.ExploreAssetResponse
import com.apibot.features.explore.dto.ImportedExploreAssetResponse
import com.apibot.shared.extensions.toJsonNode
import com.fasterxml.jackson.databind.JsonNode
import java.time.Instant
import java.util.UUID

enum class ExploreAssetKind {
    SQUAD,
    SKILL,
    KNOWLEDGE,
    SCRIPT,
    COMMAND,
    MCP,
}

enum class ExploreAssetVisibility {
    PRIVATE,
    PUBLIC,
}

data class ExploreAsset(
    val id: UUID,
    val ownerUserId: UUID?,
    val kind: ExploreAssetKind,
    val title: String,
    val description: String,
    val authorName: String,
    val tags: List<String>,
    val payload: JsonNode,
    val visibility: ExploreAssetVisibility,
    val originAssetId: UUID? = null,
    val importCount: Long,
    val isVerified: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)

fun ExploreAsset.toResponse(): ExploreAssetResponse = ExploreAssetResponse(
    id = id,
    kind = kind,
    title = title,
    description = description,
    authorName = authorName,
    tags = tags,
    payload = payload,
    visibility = visibility,
    originAssetId = originAssetId,
    importCount = importCount,
    isVerified = isVerified,
    createdAt = createdAt,
    updatedAt = updatedAt,
)

fun ExploreAsset.toImportedResponse(): ImportedExploreAssetResponse = ImportedExploreAssetResponse(
    id = id,
    sourceAssetId = originAssetId,
    kind = kind,
    title = title,
    visibility = visibility,
    createdAt = createdAt,
)

fun ExploreAsset.toPrivateImportedCopy(userId: UUID): ExploreAsset = copy(
    id = UUID.randomUUID(),
    ownerUserId = userId,
    visibility = ExploreAssetVisibility.PRIVATE,
    originAssetId = id,
    importCount = 0,
    isVerified = false,
    createdAt = Instant.now(),
    updatedAt = Instant.now(),
)

fun seedExploreAsset(
    id: UUID,
    kind: ExploreAssetKind,
    title: String,
    description: String,
    authorName: String,
    tags: List<String>,
    importCount: Long,
    isVerified: Boolean,
    createdAt: Instant,
    payload: Map<String, Any?> = mapOf("title" to title, "description" to description),
): ExploreAsset = ExploreAsset(
    id = id,
    ownerUserId = null,
    kind = kind,
    title = title,
    description = description,
    authorName = authorName,
    tags = tags,
    payload = payload.toJsonNode(),
    visibility = ExploreAssetVisibility.PUBLIC,
    originAssetId = null,
    importCount = importCount,
    isVerified = isVerified,
    createdAt = createdAt,
    updatedAt = createdAt,
)
