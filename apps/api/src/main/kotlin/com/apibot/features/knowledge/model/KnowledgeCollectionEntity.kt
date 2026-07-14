package com.apibot.features.knowledge.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "knowledge_collection")
class KnowledgeCollectionEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var userId: UUID,

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = true, length = 1000)
    var description: String? = null,

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

    // documentCount não é persistido — é enriquecido pelo service via contagem de documentos.
    fun toDomain(): KnowledgeCollection = KnowledgeCollection(
        id = this.id,
        userId = this.userId,
        name = this.name,
        description = this.description,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt,
    )
}

fun KnowledgeCollection.toEntity(): KnowledgeCollectionEntity = KnowledgeCollectionEntity(
    id = this.id,
    userId = this.userId,
    name = this.name,
    description = this.description,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
