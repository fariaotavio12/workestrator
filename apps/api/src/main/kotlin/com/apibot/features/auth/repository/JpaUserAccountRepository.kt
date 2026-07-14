package com.apibot.features.auth.repository

import com.apibot.features.auth.model.UserAccountEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaUserAccountRepository : JpaRepository<UserAccountEntity, UUID> {
    fun findByEmailIgnoreCase(email: String): UserAccountEntity?
}
