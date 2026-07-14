package com.apibot.features.oauth.controller

import com.apibot.features.oauth.catalog.OAuthProviderCatalog
import com.apibot.features.oauth.dto.ConnectorResponse
import com.apibot.features.oauth.dto.toResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/connectors")
@Tag(name = "OAuth")
@SecurityRequirement(name = "Bearer")
class ConnectorCatalogController {
    @GetMapping
    @Operation(summary = "List the declarative OAuth connector catalog — no client secrets or tokens ever included")
    fun listConnectors(): ResponseEntity<List<ConnectorResponse>> =
        ResponseEntity.ok(OAuthProviderCatalog.providers.map { it.toResponse() })
}
