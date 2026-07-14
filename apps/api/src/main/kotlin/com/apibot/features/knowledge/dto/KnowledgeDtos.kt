package com.apibot.features.knowledge.dto

import com.apibot.features.knowledge.model.DocumentStatus
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import java.time.Instant
import java.util.UUID

// --- Collections ---

@Schema(description = "Request to create a knowledge collection")
data class CreateCollectionRequest(
    @Schema(description = "Collection name")
    @field:NotBlank(message = "Name is required")
    @field:Size(max = 255, message = "Name must be at most 255 characters")
    val name: String,
    @Schema(description = "Optional description")
    @field:Size(max = 1000, message = "Description must be at most 1000 characters")
    val description: String? = null,
)

@Schema(description = "Request to update a knowledge collection")
data class UpdateCollectionRequest(
    @Schema(description = "Collection name")
    @field:Size(max = 255, message = "Name must be at most 255 characters")
    val name: String? = null,
    @Schema(description = "Optional description")
    @field:Size(max = 1000, message = "Description must be at most 1000 characters")
    val description: String? = null,
)

@Schema(description = "Knowledge collection response")
data class KnowledgeCollectionResponse(
    @Schema(description = "Collection ID") val id: UUID,
    @Schema(description = "Collection name") val name: String,
    @Schema(description = "Optional description") val description: String?,
    @Schema(description = "Number of documents in the collection") val documentCount: Int,
    @Schema(description = "Creation date") val createdAt: Instant,
    @Schema(description = "Last update date") val updatedAt: Instant,
)

// --- Documents ---

@Schema(description = "Knowledge document response")
data class KnowledgeDocumentResponse(
    @Schema(description = "Document ID") val id: UUID,
    @Schema(description = "Owning collection ID") val collectionId: UUID,
    @Schema(description = "Original filename") val filename: String,
    @Schema(description = "MIME type") val mimeType: String?,
    @Schema(description = "File size in bytes") val sizeBytes: Long,
    @Schema(description = "Raw file URL when stored (R2), null otherwise") val r2Url: String?,
    @Schema(description = "Ingestion status") val status: DocumentStatus,
    @Schema(description = "Failure reason when status is failed") val errorMessage: String?,
    @Schema(description = "Number of chunks produced by ingestion") val chunkCount: Int,
    @Schema(description = "Creation date") val createdAt: Instant,
    @Schema(description = "Last update date") val updatedAt: Instant,
)

// --- Search ---

@Schema(description = "Similarity search within a single collection")
data class SearchRequest(
    @Schema(description = "Query text")
    @field:NotBlank(message = "Query is required")
    val query: String,
    @Schema(description = "Max number of chunks to return", example = "5")
    @field:Positive(message = "topK must be positive")
    val topK: Int = 5,
    @Schema(description = "Minimum similarity score (0..1) to keep a chunk", example = "0.2")
    val minScore: Double = 0.0,
)

@Schema(description = "Similarity search across multiple collections (used by an agent's attached bases)")
data class MultiSearchRequest(
    @Schema(description = "Collection IDs to search in")
    @field:NotEmpty(message = "collectionIds is required")
    val collectionIds: List<UUID>,
    @Schema(description = "Query text")
    @field:NotBlank(message = "Query is required")
    val query: String,
    @Schema(description = "Max number of chunks to return", example = "5")
    @field:Positive(message = "topK must be positive")
    val topK: Int = 5,
    @Schema(description = "Minimum similarity score (0..1) to keep a chunk", example = "0.2")
    val minScore: Double = 0.0,
)

@Schema(description = "A single chunk match from a similarity search")
data class ChunkSearchResponse(
    @Schema(description = "Chunk ID") val chunkId: UUID,
    @Schema(description = "Source document ID") val documentId: UUID,
    @Schema(description = "Source filename") val filename: String,
    @Schema(description = "Chunk text") val content: String,
    @Schema(description = "Similarity score (0..1, higher is closer)") val score: Double,
)
