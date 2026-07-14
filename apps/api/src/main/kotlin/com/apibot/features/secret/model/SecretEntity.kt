package com.apibot.features.secret.model

import com.apibot.shared.extensions.toJsonNode
import com.apibot.shared.extensions.toObject
import com.fasterxml.jackson.databind.JsonNode
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
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
@Table(name = "secrets")
class SecretEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var userId: UUID,

    @Column(nullable = false)
    var label: String = "",

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    var authType: SecretAuthType = SecretAuthType.BEARER,

    @Column(nullable = true, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var metadata: JsonNode? = null,

    // Encrypted at rest (AES-256-GCM, see `SecretCipher`) — never the raw value.
    @Column(nullable = true, columnDefinition = "text")
    var valueCiphertext: String? = null,

    // Connector catalog preset id that created this secret (e.g. "google") — informational only, see `Secret.connectorId`.
    @Column(nullable = true)
    var connectorId: String? = null,

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

    fun toDomain(): Secret = Secret(
        id = this.id,
        userId = this.userId,
        label = this.label,
        authType = this.authType,
        metadata = this.metadata?.toObject(),
        valueCiphertext = this.valueCiphertext,
        connectorId = this.connectorId,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt,
    )
}

fun Secret.toEntity(): SecretEntity = SecretEntity(
    id = this.id,
    userId = this.userId,
    label = this.label,
    authType = this.authType,
    metadata = this.metadata?.toJsonNode(),
    valueCiphertext = this.valueCiphertext,
    connectorId = this.connectorId,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
