package com.apibot.features.explore.model

import com.apibot.shared.extensions.toJsonNode
import com.apibot.shared.extensions.toObject
import com.fasterxml.jackson.databind.JsonNode
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "community_assets")
class ExploreAssetEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(nullable = true)
    var ownerUserId: UUID? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var kind: ExploreAssetKind,

    @Column(nullable = false, length = 160)
    var title: String,

    @Column(nullable = false, columnDefinition = "text")
    var description: String,

    @Column(nullable = false, length = 120)
    var authorName: String,

    @Column(nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var tags: JsonNode,

    @Column(nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var payload: JsonNode,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var visibility: ExploreAssetVisibility = ExploreAssetVisibility.PRIVATE,

    @Column(nullable = true)
    var originAssetId: UUID? = null,

    @Column(nullable = false)
    var importCount: Long = 0,

    @Column(nullable = false, columnDefinition = "boolean default false")
    var isVerified: Boolean = false,

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

    fun toDomain(): ExploreAsset = ExploreAsset(
        id = id,
        ownerUserId = ownerUserId,
        kind = kind,
        title = title,
        description = description,
        authorName = authorName,
        tags = tags.toObject(),
        payload = payload,
        visibility = visibility,
        originAssetId = originAssetId,
        importCount = importCount,
        isVerified = isVerified,
        createdAt = createdAt,
        updatedAt = updatedAt,
    )
}

fun ExploreAsset.toEntity(): ExploreAssetEntity = ExploreAssetEntity(
    id = id,
    ownerUserId = ownerUserId,
    kind = kind,
    title = title,
    description = description,
    authorName = authorName,
    tags = tags.toJsonNode(),
    payload = payload,
    visibility = visibility,
    originAssetId = originAssetId,
    importCount = importCount,
    isVerified = isVerified,
    createdAt = createdAt,
    updatedAt = updatedAt,
)
