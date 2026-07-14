package com.apibot.features.provider.repository

import com.apibot.features.provider.model.ProviderEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaProviderRepository : JpaRepository<ProviderEntity, UUID> {
    fun findAllByUserId(userId: UUID): List<ProviderEntity>
}
