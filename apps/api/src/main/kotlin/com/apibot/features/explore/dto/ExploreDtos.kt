package com.apibot.features.explore.dto

import com.apibot.features.explore.model.ExploreAssetKind
import com.apibot.features.explore.model.ExploreAssetVisibility
import com.fasterxml.jackson.databind.JsonNode
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.Instant
import java.util.UUID

@Schema(description = "Request to create a community asset")
data class CreateExploreAssetRequest(
    @Schema(description = "Asset kind") val kind: ExploreAssetKind,
    @field:NotBlank
    @field:Size(max = 160)
    @Schema(description = "Asset title") val title: String,
    @field:NotBlank
    @Schema(description = "Short public description") val description: String,
    @Schema(description = "Search and discovery tags") val tags: List<String> = emptyList(),
    @Schema(description = "Asset payload stored as JSON") val payload: JsonNode? = null,
    @Schema(description = "Asset visibility") val visibility: ExploreAssetVisibility = ExploreAssetVisibility.PRIVATE,
)

@Schema(description = "Public community asset shown in Explore")
data class ExploreAssetResponse(
    @Schema(description = "Asset ID") val id: UUID,
    @Schema(description = "Asset kind") val kind: ExploreAssetKind,
    @Schema(description = "Asset title") val title: String,
    @Schema(description = "Short public description") val description: String,
    @Schema(description = "Public author display name") val authorName: String,
    @Schema(description = "Search and discovery tags") val tags: List<String>,
    @Schema(description = "Asset payload stored as JSON") val payload: JsonNode,
    @Schema(description = "Asset visibility") val visibility: ExploreAssetVisibility,
    @Schema(description = "Source asset ID when imported") val originAssetId: UUID?,
    @Schema(description = "How many users imported this asset") val importCount: Long,
    @Schema(description = "Whether Workestrator verified this asset") val isVerified: Boolean,
    @Schema(description = "Creation date") val createdAt: Instant,
    @Schema(description = "Last update date") val updatedAt: Instant,
)

@Schema(description = "Imported community asset")
data class ImportedExploreAssetResponse(
    @Schema(description = "Imported asset ID") val id: UUID,
    @Schema(description = "Source public asset ID") val sourceAssetId: UUID?,
    @Schema(description = "Asset kind") val kind: ExploreAssetKind,
    @Schema(description = "Imported title") val title: String,
    @Schema(description = "Imported visibility") val visibility: ExploreAssetVisibility,
    @Schema(description = "Import date") val createdAt: Instant,
)

@Schema(description = "Workestrator MCP preset for external tools")
data class ExploreMcpPresetResponse(
    @Schema(description = "Preset name") val name: String,
    @Schema(description = "Preset description") val description: String,
    @Schema(description = "Recommended transport") val transport: String,
    @Schema(description = "Base URL expected by the MCP client") val baseUrl: String,
    @Schema(description = "Required authentication headers") val headers: Map<String, String>,
    @Schema(description = "Available tools exposed by this preset") val tools: List<ExploreMcpToolResponse>,
    @Schema(description = "Assets currently owned by the authenticated user") val assets: List<ExploreAssetResponse>,
)

@Schema(description = "Tool exposed by the Workestrator MCP preset")
data class ExploreMcpToolResponse(
    @Schema(description = "Tool name") val name: String,
    @Schema(description = "Tool description") val description: String,
    @Schema(description = "HTTP method") val method: String,
    @Schema(description = "Relative endpoint path") val path: String,
)
