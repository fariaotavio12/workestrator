package com.apibot.features.auth.repository

import com.apibot.features.auth.model.UserAccount
import com.apibot.features.auth.model.toEntity
import com.apibot.features.auth.repository.UserAccountRepository
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository

@Repository
@Primary
@ConditionalOnProperty(name = ["spring.datasource.url"], matchIfMissing = false)
class JpaUserAccountRepositoryAdapter(
    private val jpaRepository: JpaUserAccountRepository,
) : UserAccountRepository {
    override fun findByEmail(email: String): UserAccount? =
        jpaRepository.findByEmailIgnoreCase(email)?.toDomain()
    
    override fun findById(id: java.util.UUID): UserAccount? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun save(userAccount: UserAccount): UserAccount =
        jpaRepository.save(userAccount.toEntity()).toDomain()
}
