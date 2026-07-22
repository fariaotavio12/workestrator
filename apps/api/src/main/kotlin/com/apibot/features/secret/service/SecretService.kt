package com.apibot.features.secret.service

import com.apibot.features.secret.crypto.SecretCipher
import com.apibot.features.secret.domain.exception.SecretAccessDeniedException
import com.apibot.features.secret.domain.exception.SecretNotFoundException
import com.apibot.features.secret.domain.exception.SecretValueNotSetException
import com.apibot.features.secret.dto.CreateSecretRequest
import com.apibot.features.secret.dto.SecretValueResponse
import com.apibot.features.secret.dto.UpdateSecretRequest
import com.apibot.features.secret.dto.UpdateSecretValueRequest
import com.apibot.features.secret.model.Secret
import com.apibot.features.secret.repository.SecretRepository
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class SecretService(
    private val secretRepository: SecretRepository,
    private val secretCipher: SecretCipher,
) {
    fun createSecret(userId: UUID, request: CreateSecretRequest): Secret {
        val secret = Secret(
            userId = userId,
            label = request.label,
            authType = request.authType,
            metadata = request.metadata,
            valueCiphertext = secretCipher.encrypt(userId, request.value),
            connectorId = request.connectorId,
            accountExternalId = request.accountExternalId,
            accountDisplayName = request.accountDisplayName,
            scopes = request.scopes,
            status = request.status,
            expiresAt = request.expiresAt,
            lastValidatedAt = request.lastValidatedAt,
        )
        return secretRepository.save(secret)
    }

    fun listSecrets(userId: UUID): List<Secret> =
        secretRepository.findAllByUserId(userId)

    fun getSecretForUser(userId: UUID, id: UUID): Secret {
        val secret = secretRepository.findById(id) ?: throw SecretNotFoundException()
        if (secret.userId != userId) throw SecretAccessDeniedException()
        return secret
    }

    fun updateSecret(userId: UUID, id: UUID, request: UpdateSecretRequest): Secret {
        val secret = getSecretForUser(userId, id)
        val updated = secret.copy(
            label = request.label,
            authType = request.authType,
            metadata = request.metadata,
            connectorId = request.connectorId ?: secret.connectorId,
            accountExternalId = request.accountExternalId ?: secret.accountExternalId,
            accountDisplayName = request.accountDisplayName ?: secret.accountDisplayName,
            scopes = request.scopes ?: secret.scopes,
            status = request.status ?: secret.status,
            expiresAt = request.expiresAt ?: secret.expiresAt,
            lastValidatedAt = request.lastValidatedAt ?: secret.lastValidatedAt,
        )
        return secretRepository.save(updated)
    }

    fun updateSecretValue(userId: UUID, id: UUID, request: UpdateSecretValueRequest): Secret {
        val secret = getSecretForUser(userId, id)
        val updated = secret.copy(valueCiphertext = secretCipher.encrypt(userId, request.value))
        return secretRepository.save(updated)
    }

    /** Decrypts the value — only meant to back `GET /secrets/{id}/value`, called by the local runner. */
    fun resolveValue(userId: UUID, id: UUID): SecretValueResponse {
        val secret = getSecretForUser(userId, id)
        val ciphertext = secret.valueCiphertext ?: throw SecretValueNotSetException()
        return SecretValueResponse(
            value = secretCipher.decrypt(userId, ciphertext),
            authType = secret.authType,
            metadata = secret.metadata,
            connectorId = secret.connectorId,
            accountExternalId = secret.accountExternalId,
            accountDisplayName = secret.accountDisplayName,
            status = secret.status,
        )
    }

    fun deleteSecret(userId: UUID, id: UUID) {
        getSecretForUser(userId, id)
        secretRepository.deleteById(id)
    }
}
