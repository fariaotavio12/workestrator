package com.apibot.features.provider.repository

import com.apibot.features.provider.model.Provider
import java.util.UUID

interface ProviderRepository {
    fun save(provider: Provider): Provider
    fun findById(id: UUID): Provider?
    fun findAllByUserId(userId: UUID): List<Provider>
    fun update(provider: Provider): Provider
    fun deleteById(id: UUID)
}
