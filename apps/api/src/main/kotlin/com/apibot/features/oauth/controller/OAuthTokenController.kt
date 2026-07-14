package com.apibot.features.oauth.controller

import com.apibot.features.oauth.dto.AccessTokenResponse
import com.apibot.features.oauth.service.OAuthTokenService
import com.apibot.security.GetUserId
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/secrets")
@Tag(name = "OAuth")
@SecurityRequirement(name = "Bearer")
class OAuthTokenController(
    private val oAuthTokenService: OAuthTokenService,
) {
    @PostMapping("/{id}/access-token")
    @Operation(
        summary = "Resolve a valid OAuth2 access token for a secret, refreshing/rotating it if needed",
        description = "Meant to be called by the local runner at execution time — never by the browser.",
    )
    fun getAccessToken(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<AccessTokenResponse> =
        ResponseEntity.ok(oAuthTokenService.resolveAccessToken(UUID.fromString(userId), id))
}
