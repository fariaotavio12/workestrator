package com.apibot.features.knowledge.controller

import com.apibot.features.knowledge.dto.ChunkSearchResponse
import com.apibot.features.knowledge.dto.CreateCollectionRequest
import com.apibot.features.knowledge.dto.KnowledgeCollectionResponse
import com.apibot.features.knowledge.dto.KnowledgeDocumentResponse
import com.apibot.features.knowledge.dto.MultiSearchRequest
import com.apibot.features.knowledge.dto.SearchRequest
import com.apibot.features.knowledge.dto.UpdateCollectionRequest
import com.apibot.features.knowledge.model.toResponse
import com.apibot.features.knowledge.service.KnowledgeService
import com.apibot.security.GetUserId
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

@RestController
@RequestMapping("/knowledge")
@Tag(name = "Knowledge")
@SecurityRequirement(name = "Bearer")
class KnowledgeController(
    private val knowledgeService: KnowledgeService,
) {
    // --- Collections ---

    @PostMapping
    @Operation(summary = "Create a knowledge collection")
    fun createCollection(
        @GetUserId userId: String,
        @Valid @RequestBody request: CreateCollectionRequest,
    ): ResponseEntity<KnowledgeCollectionResponse> {
        val collection = knowledgeService.createCollection(UUID.fromString(userId), request)
        return ResponseEntity.status(HttpStatus.CREATED).body(collection.toResponse())
    }

    @GetMapping
    @Operation(summary = "List the authenticated user's knowledge collections")
    fun listCollections(@GetUserId userId: String): ResponseEntity<List<KnowledgeCollectionResponse>> {
        val collections = knowledgeService.listCollections(UUID.fromString(userId))
        return ResponseEntity.ok(collections.map { it.toResponse() })
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a knowledge collection by ID")
    fun getCollection(
        @GetUserId userId: String,
        @PathVariable id: UUID,
    ): ResponseEntity<KnowledgeCollectionResponse> {
        val collection = knowledgeService.getCollectionForUser(UUID.fromString(userId), id)
        return ResponseEntity.ok(collection.toResponse())
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a knowledge collection")
    fun updateCollection(
        @GetUserId userId: String,
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateCollectionRequest,
    ): ResponseEntity<KnowledgeCollectionResponse> {
        val collection = knowledgeService.updateCollection(UUID.fromString(userId), id, request)
        return ResponseEntity.ok(collection.toResponse())
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a knowledge collection and all its documents")
    fun deleteCollection(@GetUserId userId: String, @PathVariable id: UUID): ResponseEntity<Void> {
        knowledgeService.deleteCollection(UUID.fromString(userId), id)
        return ResponseEntity.noContent().build()
    }

    // --- Documents ---

    @PostMapping("/{collectionId}/documents", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @Operation(summary = "Upload a document to a collection (ingested asynchronously)")
    fun uploadDocument(
        @GetUserId userId: String,
        @PathVariable collectionId: UUID,
        @RequestParam("file") file: MultipartFile,
    ): ResponseEntity<KnowledgeDocumentResponse> {
        val document = knowledgeService.uploadDocument(UUID.fromString(userId), collectionId, file)
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(document.toResponse())
    }

    @GetMapping("/{collectionId}/documents")
    @Operation(summary = "List documents of a knowledge collection")
    fun listDocuments(
        @GetUserId userId: String,
        @PathVariable collectionId: UUID,
    ): ResponseEntity<List<KnowledgeDocumentResponse>> {
        val documents = knowledgeService.listDocuments(UUID.fromString(userId), collectionId)
        return ResponseEntity.ok(documents.map { it.toResponse() })
    }

    @DeleteMapping("/{collectionId}/documents/{documentId}")
    @Operation(summary = "Delete a document and its chunks from a collection")
    fun deleteDocument(
        @GetUserId userId: String,
        @PathVariable collectionId: UUID,
        @PathVariable documentId: UUID,
    ): ResponseEntity<Void> {
        knowledgeService.deleteDocument(UUID.fromString(userId), collectionId, documentId)
        return ResponseEntity.noContent().build()
    }

    // --- Search ---

    @PostMapping("/{collectionId}/search")
    @Operation(summary = "Similarity search within a single collection")
    fun search(
        @GetUserId userId: String,
        @PathVariable collectionId: UUID,
        @Valid @RequestBody request: SearchRequest,
    ): ResponseEntity<List<ChunkSearchResponse>> {
        val results = knowledgeService.search(UUID.fromString(userId), collectionId, request)
        return ResponseEntity.ok(results.map { it.toResponse() })
    }

    @PostMapping("/search")
    @Operation(summary = "Similarity search across multiple collections (an agent's attached bases)")
    fun searchMulti(
        @GetUserId userId: String,
        @Valid @RequestBody request: MultiSearchRequest,
    ): ResponseEntity<List<ChunkSearchResponse>> {
        val results = knowledgeService.searchMulti(UUID.fromString(userId), request)
        return ResponseEntity.ok(results.map { it.toResponse() })
    }
}
