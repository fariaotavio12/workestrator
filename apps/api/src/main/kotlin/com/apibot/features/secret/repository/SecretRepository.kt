package com.apibot.features.secret.repository

import com.apibot.features.secret.model.Secret
import java.util.UUID

interface SecretRepository {
    fun save(secret: Secret): Secret
    fun findById(id: UUID): Secret?
    fun findAllByUserId(userId: UUID): List<Secret>
    fun deleteById(id: UUID)
}
