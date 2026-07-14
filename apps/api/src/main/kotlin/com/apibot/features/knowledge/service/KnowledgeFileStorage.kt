package com.apibot.features.knowledge.service

import org.springframework.beans.factory.ObjectProvider
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.UUID

/**
 * Armazena o arquivo cru do documento no R2 (Cloudflare) quando o storage está habilitado. É opcional:
 * o essencial do RAG (texto + embeddings) não depende disso, então em ambientes sem S3 (ex.: dev com
 * `app.storage.cloudflare.enabled=false`) o upload simplesmente não guarda o binário e `r2Url` fica nulo.
 */
@Service
class KnowledgeFileStorage(
    private val s3ClientProvider: ObjectProvider<S3Client>,
    @Value("\${app.storage.cloudflare.bucket:}") private val bucket: String,
    @Value("\${app.storage.cloudflare.public-url-base:}") private val publicUrlBase: String,
) {
    companion object {
        private const val ROOT_FOLDER = "knowledge"
    }

    /** Retorna a URL pública quando o arquivo foi armazenado, ou `null` quando o storage está desligado. */
    fun storeRaw(bytes: ByteArray, filename: String?, contentType: String?, collectionId: UUID, documentId: UUID): String? {
        val s3 = s3ClientProvider.ifAvailable ?: return null
        if (bucket.isBlank() || publicUrlBase.isBlank()) return null

        val extension = filename?.substringAfterLast('.', "bin")?.lowercase() ?: "bin"
        val key = "$ROOT_FOLDER/$collectionId/$documentId.$extension"
        val request = PutObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .contentType(contentType ?: "application/octet-stream")
            .build()

        s3.putObject(request, RequestBody.fromBytes(bytes))
        return makePublicUrl(key)
    }

    private fun makePublicUrl(key: String): String {
        val base = publicUrlBase.removeSuffix("/")
        val encoded = key.split("/").joinToString("/") { URLEncoder.encode(it, StandardCharsets.UTF_8) }
        return "$base/$encoded"
    }
}
