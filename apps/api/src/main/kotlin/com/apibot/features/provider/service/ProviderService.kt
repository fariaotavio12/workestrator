package com.apibot.features.provider.service

import com.apibot.features.provider.domain.exception.ProviderAccessDeniedException
import com.apibot.features.provider.domain.exception.ProviderNotFoundException
import com.apibot.features.provider.dto.CreateProviderRequest
import com.apibot.features.provider.dto.UpdateProviderRequest
import com.apibot.features.provider.model.Provider
import com.apibot.features.provider.repository.ProviderRepository
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

@Service
class ProviderService(
    private val providerRepository: ProviderRepository,
) {
    fun createProvider(userId: UUID, request: CreateProviderRequest): Provider {
        val provider = Provider(
            userId = userId,
            label = request.label,
            kind = request.kind,
            baseUrl = request.baseUrl,
            apiKeyRef = request.apiKeyRef,
            models = request.models,
        )
        return providerRepository.save(provider)
    }

    fun listProviders(userId: UUID): List<Provider> =
        providerRepository.findAllByUserId(userId)

    fun getProviderForUser(userId: UUID, id: UUID): Provider {
        val provider = providerRepository.findById(id) ?: throw ProviderNotFoundException()
        if (provider.userId != userId) throw ProviderAccessDeniedException()
        return provider
    }

    fun updateProvider(userId: UUID, id: UUID, request: UpdateProviderRequest): Provider {
        val current = getProviderForUser(userId, id)
        val updated = current.copy(
            label = request.label ?: current.label,
            kind = request.kind ?: current.kind,
            baseUrl = request.baseUrl ?: current.baseUrl,
            apiKeyRef = request.apiKeyRef ?: current.apiKeyRef,
            models = request.models ?: current.models,
            updatedAt = Instant.now(),
        )
        return providerRepository.update(updated)
    }

    fun deleteProvider(userId: UUID, id: UUID) {
        getProviderForUser(userId, id)
        providerRepository.deleteById(id)
    }
}
