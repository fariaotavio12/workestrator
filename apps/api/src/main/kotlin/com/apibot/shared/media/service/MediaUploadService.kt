package com.apibot.shared.media.service

import com.apibot.shared.media.model.MediaType
import com.apibot.shared.media.dto.UploadedMediaResponse
import com.apibot.shared.media.exception.InvalidMediaTypeException
import com.apibot.shared.media.exception.MediaSizeExceededException
import com.apibot.shared.media.exception.MediaUploadException
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.util.UUID

@Service
@ConditionalOnBean(S3Client::class)
class MediaUploadService(
    private val s3Client: S3Client,
    @Value("\${app.storage.cloudflare.bucket}") private val bucketName: String,
    @Value("\${app.storage.cloudflare.public-url-base}") private val publicUrlBase: String,
    @Value("\${app.feed.media.max-image-size-mb:5}") private val maxImageSizeMb: Long,
    @Value("\${app.feed.media.max-video-size-mb:20}") private val maxVideoSizeMb: Long,
) {
    companion object {
        val ALLOWED_IMAGE_TYPES = setOf("image/jpeg", "image/png", "image/webp")
        val ALLOWED_VIDEO_TYPES = setOf("video/mp4", "video/quicktime", "video/mov")
        private const val ROOT_FOLDER = "gainz-feed"
        private const val AVATAR_FOLDER = "gainz-avatars"
        private const val BIO_FOLDER = "gainz-bio"
        private const val EXERCISE_FOLDER = "gainz-exercises"
    }

    fun uploadImage(file: MultipartFile, userId: UUID, postId: UUID): UploadedMediaResponse {
        validateSize(file, maxImageSizeMb)
        validateType(file, ALLOWED_IMAGE_TYPES)
        val path = buildPath(userId, postId, file.originalFilename)
        return doUpload(file, path)
    }

    fun uploadAvatar(file: MultipartFile, userId: UUID): UploadedMediaResponse {
        validateSize(file, maxImageSizeMb)
        validateType(file, ALLOWED_IMAGE_TYPES)
        val path = buildAvatarPath(userId, file.originalFilename)
        return doUpload(file, path)
    }

    fun uploadBioPhoto(
        file: MultipartFile,
        userId: UUID,
        assessmentId: UUID,
        angle: String,
    ): UploadedMediaResponse {
        validateSize(file, maxImageSizeMb)
        validateType(file, ALLOWED_IMAGE_TYPES)
        val path = buildBioPhotoPath(userId, assessmentId, angle, file.originalFilename)
        return doUpload(file, path)
    }

    fun uploadExerciseImage(file: MultipartFile, exerciseId: UUID): UploadedMediaResponse {
        validateSize(file, maxImageSizeMb)
        validateType(file, ALLOWED_IMAGE_TYPES)
        val path = buildExerciseImagePath(exerciseId, file.originalFilename)
        return doUpload(file, path)
    }

    private fun doUpload(file: MultipartFile, path: String): UploadedMediaResponse {
        return try {
            val putRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(path)
                .contentType(file.contentType ?: "image/jpeg")
                .build()

            s3Client.putObject(putRequest, RequestBody.fromBytes(file.bytes))

            UploadedMediaResponse(
                url = makePublicUrl(path),
                mediaType = MediaType.IMAGE,
            )
        } catch (exception: Exception) {
            throw MediaUploadException("Não foi possível enviar a mídia")
        }
    }

    fun uploadVideo(
        file: MultipartFile,
        thumbnail: MultipartFile,
        userId: UUID,
        postId: UUID,
    ): UploadedMediaResponse {
        validateSize(file, maxVideoSizeMb)
        validateType(file, ALLOWED_VIDEO_TYPES)
        validateSize(thumbnail, maxImageSizeMb)
        validateType(thumbnail, ALLOWED_IMAGE_TYPES)

        val videoPath = buildPath(userId, postId, file.originalFilename)
        val thumbnailPath = buildPath(userId, postId, "thumb-${thumbnail.originalFilename ?: UUID.randomUUID()}")

        return try {
            val videoPutRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(videoPath)
                .contentType(file.contentType ?: "video/mp4")
                .build()

            val thumbPutRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(thumbnailPath)
                .contentType(thumbnail.contentType ?: "image/jpeg")
                .build()

            s3Client.putObject(videoPutRequest, RequestBody.fromBytes(file.bytes))
            s3Client.putObject(thumbPutRequest, RequestBody.fromBytes(thumbnail.bytes))

            UploadedMediaResponse(
                url = makePublicUrl(videoPath),
                thumbnailUrl = makePublicUrl(thumbnailPath),
                mediaType = MediaType.VIDEO,
            )
        } catch (exception: Exception) {
            throw MediaUploadException("Não foi possível enviar o vídeo do post")
        }
    }

    fun delete(mediaUrl: String?) {
        if (mediaUrl.isNullOrBlank()) return
        val key = extractPath(mediaUrl) ?: return
        
        val deleteRequest = DeleteObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .build()
            
        s3Client.deleteObject(deleteRequest)
    }

    private fun validateSize(file: MultipartFile, maxMb: Long) {
        val maxBytes = maxMb * 1024 * 1024
        if (file.size > maxBytes) {
            throw MediaSizeExceededException("Arquivo excede o limite de ${maxMb}MB")
        }
    }

    private fun validateType(file: MultipartFile, allowed: Set<String>) {
        val contentType = file.contentType ?: throw InvalidMediaTypeException("Tipo de mídia ausente")
        if (contentType !in allowed) {
            throw InvalidMediaTypeException("Tipo de mídia não suportado: $contentType")
        }
    }

    private fun buildPath(userId: UUID, postId: UUID, filename: String?): String {
        val original = filename?.substringAfterLast('/')?.substringAfterLast('\\')?.trim().orEmpty()
        val extension = original.substringAfterLast('.', "bin").lowercase()
        return "$ROOT_FOLDER/$userId/$postId/${UUID.randomUUID()}.$extension"
    }

    private fun buildAvatarPath(userId: UUID, filename: String?): String {
        val original = filename?.substringAfterLast('/')?.substringAfterLast('\\')?.trim().orEmpty()
        val extension = original.substringAfterLast('.', "bin").lowercase()
        return "$AVATAR_FOLDER/$userId/${UUID.randomUUID()}.$extension"
    }

    private fun buildBioPhotoPath(
        userId: UUID,
        assessmentId: UUID,
        angle: String,
        filename: String?,
    ): String {
        val original = filename?.substringAfterLast('/')?.substringAfterLast('\\')?.trim().orEmpty()
        val extension = original.substringAfterLast('.', "bin").lowercase()
        return "$BIO_FOLDER/$userId/$assessmentId/${angle.lowercase()}-${UUID.randomUUID()}.$extension"
    }

    private fun buildExerciseImagePath(exerciseId: UUID, filename: String?): String {
        val original = filename?.substringAfterLast('/')?.substringAfterLast('\\')?.trim().orEmpty()
        val extension = original.substringAfterLast('.', "bin").lowercase()
        return "$EXERCISE_FOLDER/$exerciseId/${UUID.randomUUID()}.$extension"
    }

    private fun makePublicUrl(path: String): String {
        val baseUrl = publicUrlBase.removeSuffix("/")
        return "$baseUrl/${path.encodeForUrlPath()}"
    }

    private fun extractPath(url: String): String? {
        val baseUrlWithSlash = if (publicUrlBase.endsWith("/")) publicUrlBase else "$publicUrlBase/"
        if (!url.startsWith(baseUrlWithSlash)) return null
        return URLDecoder.decode(url.removePrefix(baseUrlWithSlash), StandardCharsets.UTF_8)
    }
}

private fun String.encodeForUrlPath(): String =
    split("/").joinToString("/") { segment -> java.net.URLEncoder.encode(segment, StandardCharsets.UTF_8) }
