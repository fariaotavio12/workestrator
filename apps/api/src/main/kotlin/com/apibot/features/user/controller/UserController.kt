package com.apibot.features.user.controller

import com.apibot.features.user.service.UserService
import com.apibot.features.user.dto.CreateUserRequest
import com.apibot.features.user.dto.UpdateUserRequest
import com.apibot.features.user.dto.UserResponse
import com.apibot.features.user.model.UserFilter
import com.apibot.features.user.model.toResponse
import com.apibot.shared.extensions.PageRequestParams
import com.apibot.shared.extensions.PageResult
import com.apibot.shared.extensions.map
import com.apibot.shared.media.service.MediaUploadService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

@RestController
@RequestMapping(value = ["/users"])
@Tag(name = "User")
class UserController(
    private val userService: UserService,
    private val mediaUploadService: MediaUploadService,
) {
    @PostMapping
    @Operation(summary = "Create a new user")
    @SecurityRequirement(name = "Bearer")
    fun createUser(@Valid @RequestBody request: CreateUserRequest): ResponseEntity<UserResponse> {
        val user = userService.createUser(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(user.toResponse())
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID")
    @SecurityRequirement(name = "Bearer")
    fun getUserById(@PathVariable id: UUID): ResponseEntity<UserResponse> {
        val user = userService.getUserById(id)
        return ResponseEntity.ok(user.toResponse())
    }

    @GetMapping
    @Operation(summary = "List all users")
    @SecurityRequirement(name = "Bearer")
    fun listUsers(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) name: String?,
        @RequestParam(required = false) email: String?,
        @RequestParam(required = false) isActive: Boolean?,
        @RequestParam(required = false) search: String?,
        @RequestParam(defaultValue = "createdAt") sortBy: String,
        @RequestParam(defaultValue = "true") sortDesc: Boolean,
    ): ResponseEntity<PageResult<UserResponse>> {
        val result = userService.listUsers(
            pageRequest = PageRequestParams(page = page, size = size),
            filter = UserFilter(
                name = name,
                email = email,
                isActive = isActive,
                search = search,
                sortBy = sortBy,
                sortDesc = sortDesc,
            ),
        )
        return ResponseEntity.ok(result.map { it.toResponse() })
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update user")
    @SecurityRequirement(name = "Bearer")
    fun updateUser(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateUserRequest,
    ): ResponseEntity<UserResponse> {
        val user = userService.updateUser(id, request)
        return ResponseEntity.ok(user.toResponse())
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete user")
    @SecurityRequirement(name = "Bearer")
    fun deleteUser(@PathVariable id: UUID): ResponseEntity<Void> {
        userService.deleteUser(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{id}/activate")
    @Operation(summary = "Activate user")
    @SecurityRequirement(name = "Bearer")
    fun activateUser(@PathVariable id: UUID): ResponseEntity<UserResponse> {
        val user = userService.activateUser(id)
        return ResponseEntity.ok(user.toResponse())
    }

    @PostMapping("/{id}/deactivate")
    @Operation(summary = "Deactivate user")
    @SecurityRequirement(name = "Bearer")
    fun deactivateUser(@PathVariable id: UUID): ResponseEntity<UserResponse> {
        val user = userService.deactivateUser(id)
        return ResponseEntity.ok(user.toResponse())
    }

    @PostMapping("/{id}/avatar", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @Operation(summary = "Upload profile picture")
    @SecurityRequirement(name = "Bearer")
    fun uploadAvatar(
        @PathVariable id: UUID,
        @RequestParam("file") file: MultipartFile,
    ): ResponseEntity<UserResponse> {
        val uploadedMedia = mediaUploadService.uploadAvatar(file, id)
        val user = userService.updateUser(id, UpdateUserRequest(img = uploadedMedia.url))
        return ResponseEntity.ok(user.toResponse())
    }
}
