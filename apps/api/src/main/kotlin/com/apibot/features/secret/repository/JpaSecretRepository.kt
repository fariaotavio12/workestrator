package com.apibot.features.secret.repository

import com.apibot.features.secret.model.SecretEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaSecretRepository : JpaRepository<SecretEntity, UUID> {
    fun findAllByUserId(userId: UUID): List<SecretEntity>
}
