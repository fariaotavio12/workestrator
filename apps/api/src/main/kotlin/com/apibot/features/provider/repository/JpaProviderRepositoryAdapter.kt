package com.apibot.features.provider.repository

import com.apibot.features.provider.model.Provider
import com.apibot.features.provider.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaProviderRepositoryAdapter(
    private val jpaRepository: JpaProviderRepository,
) : ProviderRepository {
    override fun save(provider: Provider): Provider =
        jpaRepository.save(provider.toEntity()).toDomain()

    override fun findById(id: UUID): Provider? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun findAllByUserId(userId: UUID): List<Provider> =
        jpaRepository.findAllByUserId(userId).map { it.toDomain() }

    override fun update(provider: Provider): Provider =
        jpaRepository.save(provider.toEntity()).toDomain()

    override fun deleteById(id: UUID) =
        jpaRepository.deleteById(id)
}
