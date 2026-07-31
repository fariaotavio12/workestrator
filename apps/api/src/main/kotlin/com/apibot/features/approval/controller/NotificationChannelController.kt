package com.apibot.features.approval.controller

import com.apibot.features.approval.dto.CreateNotificationChannelRequest
import com.apibot.features.approval.dto.NotificationChannelResponse
import com.apibot.features.approval.dto.NotificationChannelTestResponse
import com.apibot.features.approval.dto.UpdateNotificationChannelRequest
import com.apibot.features.approval.model.toResponse
import com.apibot.features.approval.service.NotificationChannelService
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
@RequestMapping("/notification-channels")
@Tag(name = "Notification Channel")
@SecurityRequirement(name = "Bearer")
class NotificationChannelController(
    private val service: NotificationChannelService,
) {
    @PostMapping
    @Operation(summary = "Create a notification channel (n8n webhook) for external checkpoint alerts")
    fun create(
        @GetUserId userId: String,
        @Valid @RequestBody request: CreateNotificationChannelRequest,
    ): ResponseEntity<NotificationChannelResponse> {
        val channel = service.create(UUID.fromString(userId), request)
        return ResponseEntity.status(HttpStatus.CREATED).body(channel.toResponse())
    }

    @GetMapping
    @Operation(summary = "List the authenticated user's notification channels")
    fun list(@GetUserId userId: String): ResponseEntity<List<NotificationChannelResponse>> {
        val channels = service.list(UUID.fromString(userId))
        return ResponseEntity.ok(channels.map { it.toResponse() })
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a notification channel by ID")
    fun get(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<NotificationChannelResponse> {
        val channel = service.getForUser(UUID.fromString(userId), id)
        return ResponseEntity.ok(channel.toResponse())
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a notification channel")
    fun update(
        @GetUserId userId: String,
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateNotificationChannelRequest,
    ): ResponseEntity<NotificationChannelResponse> {
        val channel = service.update(UUID.fromString(userId), id, request)
        return ResponseEntity.ok(channel.toResponse())
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a notification channel")
    fun delete(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<Void> {
        service.delete(UUID.fromString(userId), id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{id}/test")
    @Operation(summary = "Send a sample notification through this channel")
    fun test(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<NotificationChannelTestResponse> =
        ResponseEntity.ok(service.test(UUID.fromString(userId), id))
}
