package com.apibot.features.explore.controller

import com.apibot.features.explore.dto.CreateExploreAssetRequest
import com.apibot.features.explore.dto.ExploreAssetResponse
import com.apibot.features.explore.dto.ExploreMcpPresetResponse
import com.apibot.features.explore.dto.ImportedExploreAssetResponse
import com.apibot.features.explore.model.ExploreAssetKind
import com.apibot.features.explore.model.toResponse
import com.apibot.features.explore.service.ExploreService
import com.apibot.security.GetUserId
import com.apibot.shared.extensions.PageRequestParams
import com.apibot.shared.extensions.PageResult
import com.apibot.shared.extensions.map
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/explore")
@Tag(name = "Explore")
class ExploreController(
    private val exploreService: ExploreService,
) {
    @GetMapping("/assets")
    @Operation(summary = "List public community assets")
    fun listAssets(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) type: ExploreAssetKind?,
        @RequestParam(required = false) search: String?,
    ): ResponseEntity<PageResult<ExploreAssetResponse>> {
        val params = PageRequestParams(page, size).normalized(maxSize = 50)
        return ResponseEntity.ok(exploreService.listAssets(params, type, search).map { it.toResponse() })
    }

    @GetMapping("/assets/me")
    @Operation(summary = "List assets owned by the authenticated user")
    @SecurityRequirement(name = "Bearer")
    fun listMyAssets(
        @GetUserId userId: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<PageResult<ExploreAssetResponse>> {
        val params = PageRequestParams(page, size).normalized(maxSize = 50)
        return ResponseEntity.ok(exploreService.listMyAssets(UUID.fromString(userId), params).map { it.toResponse() })
    }

    @PostMapping("/assets")
    @Operation(summary = "Create a community asset")
    @SecurityRequirement(name = "Bearer")
    fun createAsset(
        @GetUserId userId: String,
        @Valid @RequestBody request: CreateExploreAssetRequest,
    ): ResponseEntity<ExploreAssetResponse> {
        val asset = exploreService.createAsset(UUID.fromString(userId), request, authorName = "Community")
        return ResponseEntity.status(HttpStatus.CREATED).body(asset.toResponse())
    }

    @PostMapping("/assets/{id}/publish")
    @Operation(summary = "Publish an owned asset")
    @SecurityRequirement(name = "Bearer")
    fun publishAsset(
        @GetUserId userId: String,
        @PathVariable id: UUID,
    ): ResponseEntity<ExploreAssetResponse> =
        ResponseEntity.ok(exploreService.publishAsset(UUID.fromString(userId), id).toResponse())

    @PostMapping("/assets/{id}/unpublish")
    @Operation(summary = "Unpublish an owned asset")
    @SecurityRequirement(name = "Bearer")
    fun unpublishAsset(
        @GetUserId userId: String,
        @PathVariable id: UUID,
    ): ResponseEntity<ExploreAssetResponse> =
        ResponseEntity.ok(exploreService.unpublishAsset(UUID.fromString(userId), id).toResponse())

    @PostMapping("/assets/{id}/import")
    @Operation(summary = "Import a public community asset")
    @SecurityRequirement(name = "Bearer")
    fun importAsset(
        @GetUserId userId: String,
        @PathVariable id: UUID,
    ): ResponseEntity<ImportedExploreAssetResponse> =
        ResponseEntity.status(HttpStatus.CREATED).body(exploreService.importAsset(UUID.fromString(userId), id))

    @GetMapping("/mcp/preset")
    @Operation(summary = "Get the Workestrator MCP preset")
    @SecurityRequirement(name = "Bearer")
    fun getMcpPreset(@GetUserId userId: String): ResponseEntity<ExploreMcpPresetResponse> =
        ResponseEntity.ok(exploreService.getMcpPreset(UUID.fromString(userId)))
}
