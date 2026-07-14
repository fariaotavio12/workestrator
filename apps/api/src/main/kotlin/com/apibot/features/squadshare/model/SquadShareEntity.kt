package com.apibot.features.squadshare.model

import com.apibot.shared.extensions.toJsonNode
import com.apibot.shared.extensions.toObject
import com.fasterxml.jackson.databind.JsonNode
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "squad_shares")
class SquadShareEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(nullable = false, unique = true)
    var token: String,

    @Column(nullable = false)
    var squadId: UUID,

    @Column(nullable = false)
    var ownerUserId: UUID,

    @Column(nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var payload: JsonNode,

    @Column(nullable = false, columnDefinition = "boolean default false")
    var revoked: Boolean = false,

    @Column(nullable = false, columnDefinition = "integer default 0")
    var acceptCount: Int = 0,

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

    fun toDomain(): SquadShare = SquadShare(
        id = this.id,
        token = this.token,
        squadId = this.squadId,
        ownerUserId = this.ownerUserId,
        payload = this.payload.toObject(),
        revoked = this.revoked,
        acceptCount = this.acceptCount,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt,
    )
}

fun SquadShare.toEntity(): SquadShareEntity = SquadShareEntity(
    id = this.id,
    token = this.token,
    squadId = this.squadId,
    ownerUserId = this.ownerUserId,
    payload = this.payload.toJsonNode(),
    revoked = this.revoked,
    acceptCount = this.acceptCount,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
