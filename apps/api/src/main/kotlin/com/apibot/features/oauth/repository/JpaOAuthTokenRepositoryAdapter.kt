package com.apibot.features.oauth.repository

import com.apibot.features.oauth.model.OAuthToken
import com.apibot.features.oauth.model.toDomain
import com.apibot.features.oauth.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaOAuthTokenRepositoryAdapter(
    private val jpaRepository: JpaOAuthTokenRepository,
) : OAuthTokenRepository {
    override fun findBySecretId(secretId: UUID): OAuthToken? =
        jpaRepository.findById(secretId).map { it.toDomain() }.orElse(null)

    override fun save(token: OAuthToken): OAuthToken =
        jpaRepository.save(token.toEntity()).toDomain()
}
