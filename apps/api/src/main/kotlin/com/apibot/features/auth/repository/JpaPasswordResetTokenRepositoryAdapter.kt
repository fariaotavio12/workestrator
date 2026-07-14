package com.apibot.features.auth.repository

import com.apibot.features.auth.model.PasswordResetToken
import com.apibot.features.auth.model.PasswordResetTokenEntity
import com.apibot.features.auth.model.toDomain
import com.apibot.features.auth.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaPasswordResetTokenRepositoryAdapter(
    private val jpaRepository: JpaPasswordResetTokenRepository,
) : PasswordResetTokenRepository {

    override fun findByToken(token: String): PasswordResetToken? =
        jpaRepository.findByToken(token)?.toDomain()

    override fun findByUserId(userId: UUID): PasswordResetToken? =
        jpaRepository.findByUserId(userId)?.toDomain()

    override fun deleteByUserId(userId: UUID) =
        jpaRepository.deleteByUserId(userId)

    override fun save(token: PasswordResetToken): PasswordResetToken =
        jpaRepository.save(token.toEntity()).toDomain()

    override fun update(token: PasswordResetToken): PasswordResetToken =
        jpaRepository.save(token.toEntity()).toDomain()
}

