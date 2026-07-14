package com.apibot.features.auth.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "user_accounts")
class UserAccountEntity(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(unique = true, nullable = false)
    val email: String = "",

    @Column(nullable = false)
    val passwordHash: String = "",

    @Column(nullable = false, updatable = false)
    val createdAt: Long = System.currentTimeMillis(),
) {
    fun toDomain(): UserAccount = UserAccount(
        id = this.id,
        email = this.email,
        passwordHash = this.passwordHash,
    )
}

fun UserAccount.toEntity(): UserAccountEntity = UserAccountEntity(
    id = this.id,
    email = this.email,
    passwordHash = this.passwordHash,
)
