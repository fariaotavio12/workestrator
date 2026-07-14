package com.apibot.features.auth.repository

import com.apibot.features.auth.model.UserAccount
import java.util.UUID

interface UserAccountRepository {
    fun findByEmail(email: String): UserAccount?
    fun findById(id: UUID): UserAccount?
    fun save(userAccount: UserAccount): UserAccount
}
