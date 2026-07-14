package com.apibot.features.user.repository

import com.apibot.features.user.model.UserEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface JpaUserRepository : JpaRepository<UserEntity, UUID>, JpaSpecificationExecutor<UserEntity> {
    fun findByEmailIgnoreCase(email: String): UserEntity?
}
