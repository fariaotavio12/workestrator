package com.apibot.features.provider.model

import com.apibot.shared.extensions.toJsonNode
import com.apibot.shared.extensions.toObject
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
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

private val emptyModelsNode: JsonNode = jacksonObjectMapper().createArrayNode()

@Entity
@Table(name = "providers")
class ProviderEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var userId: UUID,

    @Column(nullable = false)
    var label: String = "",

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    var kind: ProviderKind = ProviderKind.CLAUDE_CLI,

    @Column(nullable = true)
    var baseUrl: String? = null,

    @Column(nullable = true)
    var apiKeyRef: String? = null,

    @Column(nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var models: JsonNode = emptyModelsNode,

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

    fun toDomain(): Provider = Provider(
        id = this.id,
        userId = this.userId,
        label = this.label,
        kind = this.kind,
        baseUrl = this.baseUrl,
        apiKeyRef = this.apiKeyRef,
        models = this.models.toObject(),
        createdAt = this.createdAt,
        updatedAt = this.updatedAt,
    )
}

fun Provider.toEntity(): ProviderEntity = ProviderEntity(
    id = this.id,
    userId = this.userId,
    label = this.label,
    kind = this.kind,
    baseUrl = this.baseUrl,
    apiKeyRef = this.apiKeyRef,
    models = this.models.toJsonNode(),
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
