package com.apibot.features.knowledge.model

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
@Table(name = "knowledge_document")
class KnowledgeDocumentEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var collectionId: UUID,

    @Column(nullable = false)
    var filename: String = "",

    @Column(nullable = true)
    var mimeType: String? = null,

    @Column(nullable = false)
    var sizeBytes: Long = 0,

    @Column(nullable = true, length = 1000)
    var r2Url: String? = null,

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    var status: DocumentStatus = DocumentStatus.PENDING,

    @Column(nullable = true, length = 2000)
    var errorMessage: String? = null,

    @Column(nullable = false)
    var chunkCount: Int = 0,

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

    fun toDomain(): KnowledgeDocument = KnowledgeDocument(
        id = this.id,
        collectionId = this.collectionId,
        filename = this.filename,
        mimeType = this.mimeType,
        sizeBytes = this.sizeBytes,
        r2Url = this.r2Url,
        status = this.status,
        errorMessage = this.errorMessage,
        chunkCount = this.chunkCount,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt,
    )
}

fun KnowledgeDocument.toEntity(): KnowledgeDocumentEntity = KnowledgeDocumentEntity(
    id = this.id,
    collectionId = this.collectionId,
    filename = this.filename,
    mimeType = this.mimeType,
    sizeBytes = this.sizeBytes,
    r2Url = this.r2Url,
    status = this.status,
    errorMessage = this.errorMessage,
    chunkCount = this.chunkCount,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
