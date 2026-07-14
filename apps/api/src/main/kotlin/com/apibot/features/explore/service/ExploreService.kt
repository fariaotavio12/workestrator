package com.apibot.features.explore.service

import com.apibot.features.explore.dto.CreateExploreAssetRequest
import com.apibot.features.explore.dto.ExploreMcpPresetResponse
import com.apibot.features.explore.dto.ExploreMcpToolResponse
import com.apibot.features.explore.model.ExploreAsset
import com.apibot.features.explore.model.ExploreAssetKind
import com.apibot.features.explore.model.ExploreAssetVisibility
import com.apibot.features.explore.model.seedExploreAsset
import com.apibot.features.explore.model.toResponse
import com.apibot.features.explore.model.toImportedResponse
import com.apibot.features.explore.model.toPrivateImportedCopy
import com.apibot.features.explore.repository.ExploreAssetRepository
import com.apibot.shared.exceptions.ResourceNotFoundException
import com.apibot.shared.extensions.PageRequestParams
import com.apibot.shared.extensions.PageResult
import com.apibot.shared.extensions.toJsonNode
import jakarta.annotation.PostConstruct
import org.slf4j.LoggerFactory
import org.springframework.dao.DataAccessException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class ExploreService(
    private val assetRepository: ExploreAssetRepository,
) {
    fun listAssets(
        params: PageRequestParams,
        kind: ExploreAssetKind?,
        search: String?,
    ): PageResult<ExploreAsset> =
        assetRepository.listPublic(params, kind, search)

    fun listMyAssets(userId: UUID, params: PageRequestParams): PageResult<ExploreAsset> =
        assetRepository.listByOwner(userId, params)

    @Transactional
    fun createAsset(userId: UUID, request: CreateExploreAssetRequest, authorName: String): ExploreAsset {
        val now = Instant.now()
        val asset = ExploreAsset(
            id = UUID.randomUUID(),
            ownerUserId = userId,
            kind = request.kind,
            title = request.title.trim(),
            description = request.description.trim(),
            authorName = authorName.ifBlank { "Community" },
            tags = request.tags.map { it.trim() }.filter { it.isNotBlank() }.distinct().take(MAX_TAGS),
            payload = request.payload ?: mapOf("title" to request.title, "description" to request.description).toJsonNode(),
            visibility = request.visibility,
            originAssetId = null,
            importCount = 0,
            isVerified = false,
            createdAt = now,
            updatedAt = now,
        )

        return assetRepository.save(asset)
    }

    @Transactional
    fun publishAsset(userId: UUID, assetId: UUID): ExploreAsset {
        val asset = findOwnedAsset(userId, assetId)
        return assetRepository.update(asset.copy(visibility = ExploreAssetVisibility.PUBLIC, updatedAt = Instant.now()))
    }

    @Transactional
    fun unpublishAsset(userId: UUID, assetId: UUID): ExploreAsset {
        val asset = findOwnedAsset(userId, assetId)
        return assetRepository.update(asset.copy(visibility = ExploreAssetVisibility.PRIVATE, updatedAt = Instant.now()))
    }

    @Transactional
    fun importAsset(userId: UUID, sourceAssetId: UUID) =
        assetRepository.findById(sourceAssetId)
            ?.takeIf { it.visibility == ExploreAssetVisibility.PUBLIC }
            ?.let { source ->
                val imported = assetRepository.save(source.toPrivateImportedCopy(userId))
                assetRepository.update(source.copy(importCount = source.importCount + 1, updatedAt = Instant.now()))
                imported.toImportedResponse()
            }
            ?: throw ResourceNotFoundException("Explore asset not found")

    fun getMcpPreset(userId: UUID): ExploreMcpPresetResponse {
        val assets = assetRepository.listByOwner(userId, PageRequestParams(page = 0, size = MCP_ASSET_LIMIT)).data

        return ExploreMcpPresetResponse(
            name = "Workestrator Community Assets",
            description = "Preset for exposing your Workestrator squads, skills, knowledge, scripts, commands and MCP assets.",
            transport = "http",
            baseUrl = "/",
            headers = mapOf("Authorization" to "Bearer <WORKESTRATOR_TOKEN>"),
            tools = mcpTools,
            assets = assets.map { it.toResponse() },
        )
    }

    private fun findOwnedAsset(userId: UUID, assetId: UUID): ExploreAsset =
        assetRepository.findById(assetId)
            ?.takeIf { it.ownerUserId == userId }
            ?: throw ResourceNotFoundException("Explore asset not found")

    @PostConstruct
    fun seedInitialCatalog() {
        try {
            seedAssets.forEach { asset ->
                if (!assetRepository.existsById(asset.id)) {
                    assetRepository.save(asset)
                }
            }
        } catch (exception: DataAccessException) {
            logger.warn("Explore catalog seed skipped because community_assets is not ready.", exception)
        }
    }

    private companion object {
        private val logger = LoggerFactory.getLogger(ExploreService::class.java)
        private const val MAX_TAGS = 12
        private const val MCP_ASSET_LIMIT = 100
        private val baseTime: Instant = Instant.parse("2026-07-01T12:00:00Z")

        private val mcpTools = listOf(
            ExploreMcpToolResponse(
                name = "workestrator.explore.search",
                description = "Search public community assets.",
                method = "GET",
                path = "/explore/assets?search={query}&type={type}",
            ),
            ExploreMcpToolResponse(
                name = "workestrator.assets.mine",
                description = "List assets owned by the authenticated user.",
                method = "GET",
                path = "/explore/assets/me",
            ),
            ExploreMcpToolResponse(
                name = "workestrator.assets.create",
                description = "Create a private or public community asset.",
                method = "POST",
                path = "/explore/assets",
            ),
            ExploreMcpToolResponse(
                name = "workestrator.assets.import",
                description = "Import a public asset into the authenticated user library.",
                method = "POST",
                path = "/explore/assets/{id}/import",
            ),
            ExploreMcpToolResponse(
                name = "workestrator.assets.publish",
                description = "Publish an owned asset to Explore.",
                method = "POST",
                path = "/explore/assets/{id}/publish",
            ),
        )

        private val seedAssets = listOf(
            seedExploreAsset(
                id = UUID.fromString("11111111-1111-4111-8111-111111111111"),
                kind = ExploreAssetKind.SKILL,
                title = "Skill Builder",
                description = "Create reusable skills with triggers, steps and quality checklist.",
                authorName = "Workestrator",
                tags = listOf("skill", "authoring", "workflow"),
                importCount = 128,
                isVerified = true,
                createdAt = baseTime,
            ),
            seedExploreAsset(
                id = UUID.fromString("22222222-2222-4222-8222-222222222222"),
                kind = ExploreAssetKind.SQUAD,
                title = "Release Review Squad",
                description = "A squad for reviewing diffs, checks, risks and release notes before deploy.",
                authorName = "Workestrator",
                tags = listOf("release", "review", "deploy"),
                importCount = 94,
                isVerified = true,
                createdAt = baseTime.minusSeconds(86_400),
            ),
            seedExploreAsset(
                id = UUID.fromString("33333333-3333-4333-8333-333333333333"),
                kind = ExploreAssetKind.KNOWLEDGE,
                title = "Open Source Maintainer Guide",
                description = "A starter knowledge base for contribution, triage and review policies.",
                authorName = "Community",
                tags = listOf("opensource", "governance", "docs"),
                importCount = 61,
                isVerified = false,
                createdAt = baseTime.minusSeconds(172_800),
            ),
            seedExploreAsset(
                id = UUID.fromString("44444444-4444-4444-8444-444444444444"),
                kind = ExploreAssetKind.SCRIPT,
                title = "Frontend Quality Check",
                description = "Runs typecheck, lint and build in a frontend workspace.",
                authorName = "Workestrator",
                tags = listOf("frontend", "validation", "ci"),
                importCount = 87,
                isVerified = true,
                createdAt = baseTime.minusSeconds(259_200),
            ),
            seedExploreAsset(
                id = UUID.fromString("55555555-5555-4555-8555-555555555555"),
                kind = ExploreAssetKind.COMMAND,
                title = "Plan Code Change",
                description = "Turns a technical idea into implementation tasks, risks and tests.",
                authorName = "Workestrator",
                tags = listOf("planning", "code", "assistant"),
                importCount = 112,
                isVerified = true,
                createdAt = baseTime.minusSeconds(345_600),
            ),
            seedExploreAsset(
                id = UUID.fromString("66666666-6666-4666-8666-666666666666"),
                kind = ExploreAssetKind.MCP,
                title = "Workestrator MCP Preset",
                description = "Starter MCP preset for exposing squads, scripts and knowledge as tools.",
                authorName = "Workestrator",
                tags = listOf("mcp", "integration", "tools"),
                importCount = 43,
                isVerified = true,
                createdAt = baseTime.minusSeconds(432_000),
            ),
        )
    }
}
