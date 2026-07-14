package com.apibot.features.provider.controller

import com.apibot.features.provider.dto.CreateProviderRequest
import com.apibot.features.provider.dto.ProviderResponse
import com.apibot.features.provider.dto.UpdateProviderRequest
import com.apibot.features.provider.model.toResponse
import com.apibot.features.provider.service.ProviderService
import com.apibot.security.GetUserId
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/providers")
@Tag(name = "Provider")
@SecurityRequirement(name = "Bearer")
class ProviderController(
    private val providerService: ProviderService,
) {
    @PostMapping
    @Operation(summary = "Create a new model provider")
    fun createProvider(
        @GetUserId userId: String,
        @Valid @RequestBody request: CreateProviderRequest,
    ): ResponseEntity<ProviderResponse> {
        val provider = providerService.createProvider(UUID.fromString(userId), request)
        return ResponseEntity.status(HttpStatus.CREATED).body(provider.toResponse())
    }

    @GetMapping
    @Operation(summary = "List model providers of the authenticated user")
    fun listProviders(@GetUserId userId: String): ResponseEntity<List<ProviderResponse>> {
        val providers = providerService.listProviders(UUID.fromString(userId))
        return ResponseEntity.ok(providers.map { it.toResponse() })
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a model provider by ID")
    fun getProvider(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<ProviderResponse> {
        val provider = providerService.getProviderForUser(UUID.fromString(userId), id)
        return ResponseEntity.ok(provider.toResponse())
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a model provider")
    fun updateProvider(
        @GetUserId userId: String,
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateProviderRequest,
    ): ResponseEntity<ProviderResponse> {
        val provider = providerService.updateProvider(UUID.fromString(userId), id, request)
        return ResponseEntity.ok(provider.toResponse())
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a model provider")
    fun deleteProvider(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<Void> {
        providerService.deleteProvider(UUID.fromString(userId), id)
        return ResponseEntity.noContent().build()
    }
}
