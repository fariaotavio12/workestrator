package com.apibot.features.approval.dto

import com.apibot.features.approval.model.NotificationChannelKind
import com.apibot.features.approval.model.NotificationChannelStatus
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.util.UUID

@Schema(description = "Request to create a notification channel (n8n webhook)")
data class CreateNotificationChannelRequest(
    @field:NotBlank(message = "Label is required")
    @Schema(description = "Display label", example = "Teams — Bruno")
    val label: String,

    @field:NotBlank(message = "URL is required")
    @Schema(description = "n8n webhook URL — never returned by the API")
    val url: String,

    @Schema(description = "Secret holding the auth header value, if any")
    val authSecretId: UUID? = null,

    @Schema(description = "Auth header name, if any", example = "X-Workestrator-Token")
    val authHeaderName: String? = null,
)

@Schema(description = "Request to update a notification channel")
data class UpdateNotificationChannelRequest(
    @Schema(description = "Display label") val label: String? = null,
    @Schema(description = "n8n webhook URL — never returned by the API") val url: String? = null,
    @Schema(description = "Secret holding the auth header value, if any") val authSecretId: UUID? = null,
    @Schema(description = "Auth header name, if any") val authHeaderName: String? = null,
    @Schema(description = "Channel status") val status: NotificationChannelStatus? = null,
)

@Schema(description = "Notification channel response — the webhook URL is never included")
data class NotificationChannelResponse(
    @Schema(description = "Channel ID") val id: UUID,
    @Schema(description = "Display label") val label: String,
    @Schema(description = "Channel kind") val kind: NotificationChannelKind,
    @Schema(description = "Whether a URL is configured") val hasUrl: Boolean,
    @Schema(description = "Host of the configured URL, for visual confirmation only") val urlHost: String?,
    @Schema(description = "Auth header name, if any") val authHeaderName: String?,
    @Schema(description = "Channel status") val status: NotificationChannelStatus,
    @Schema(description = "Last successful test") val lastTestedAt: Instant?,
    @Schema(description = "Last delivery error, if any") val lastError: String?,
    @Schema(description = "Creation date") val createdAt: Instant,
    @Schema(description = "Last update date") val updatedAt: Instant,
)

@Schema(description = "Result of a test notification send")
data class NotificationChannelTestResponse(
    @Schema(description = "Whether the test send succeeded") val success: Boolean,
    @Schema(description = "Error message, if it failed") val error: String? = null,
)
