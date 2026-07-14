package com.apibot.features.auth.repository

import com.apibot.features.auth.model.UserSession
import com.apibot.features.auth.model.toEntity
import com.apibot.features.auth.repository.UserSessionRepository
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository

@Repository
@Primary
@ConditionalOnProperty(name = ["spring.datasource.url"], matchIfMissing = false)
class JpaUserSessionRepositoryAdapter(
    private val jpaRepository: JpaUserSessionRepository,
) : UserSessionRepository {
    override fun save(session: UserSession): UserSession {
        val entity = session.toEntity()
        jpaRepository.save(entity)
        return session
    }

    override fun findByToken(token: String): UserSession? =
        jpaRepository.findById(token)
            .map { it.toDomain() }
            .orElse(null)

    override fun deleteByToken(token: String) {
        jpaRepository.deleteById(token)
    }

    override fun deleteByUserId(userId: java.util.UUID) {
        jpaRepository.deleteAllByUserId(userId)
    }
}
