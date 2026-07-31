package com.apibot.features.approval.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "notification_channels")
class NotificationChannelEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var userId: UUID,

    @Column(nullable = false)
    var label: String = "",

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    var kind: NotificationChannelKind = NotificationChannelKind.WEBHOOK,

    @Column(nullable = false, columnDefinition = "text")
    var url: String = "",

    @Column(nullable = true)
    var authSecretId: UUID? = null,

    @Column(nullable = true)
    var authHeaderName: String? = null,

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    var status: NotificationChannelStatus = NotificationChannelStatus.ACTIVE,

    @Column(nullable = true)
    var lastTestedAt: Instant? = null,

    @Column(nullable = true, columnDefinition = "text")
    var lastError: String? = null,

    @Column(nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    @Column(nullable = false)
    var updatedAt: Instant = Instant.now(),
) {
    @PrePersist
    fun prePersist() {
        val now = Instant.now()
        createdAt = now
        updatedAt = now
    }

    @PreUpdate
    fun preUpdate() {
        updatedAt = Instant.now()
    }

    fun toDomain(): NotificationChannel = NotificationChannel(
        id = this.id,
        userId = this.userId,
        label = this.label,
        kind = this.kind,
        url = this.url,
        authSecretId = this.authSecretId,
        authHeaderName = this.authHeaderName,
        status = this.status,
        lastTestedAt = this.lastTestedAt,
        lastError = this.lastError,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt,
    )
}

fun NotificationChannel.toEntity(): NotificationChannelEntity = NotificationChannelEntity(
    id = this.id,
    userId = this.userId,
    label = this.label,
    kind = this.kind,
    url = this.url,
    authSecretId = this.authSecretId,
    authHeaderName = this.authHeaderName,
    status = this.status,
    lastTestedAt = this.lastTestedAt,
    lastError = this.lastError,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
