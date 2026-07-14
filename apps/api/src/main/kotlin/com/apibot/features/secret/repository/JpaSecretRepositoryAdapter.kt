package com.apibot.features.secret.repository

import com.apibot.features.secret.model.Secret
import com.apibot.features.secret.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaSecretRepositoryAdapter(
    private val jpaRepository: JpaSecretRepository,
) : SecretRepository {
    override fun save(secret: Secret): Secret =
        jpaRepository.save(secret.toEntity()).toDomain()

    override fun findById(id: UUID): Secret? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun findAllByUserId(userId: UUID): List<Secret> =
        jpaRepository.findAllByUserId(userId).map { it.toDomain() }

    override fun deleteById(id: UUID) =
        jpaRepository.deleteById(id)
}
