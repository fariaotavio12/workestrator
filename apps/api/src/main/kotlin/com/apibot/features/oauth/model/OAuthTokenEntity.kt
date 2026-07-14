package com.apibot.features.oauth.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "oauth_tokens")
class OAuthTokenEntity(
    @Id
    var secretId: UUID,

    @Column(nullable = false, columnDefinition = "text")
    var accessTokenCiphertext: String,

    @Column(nullable = false)
    var expiresAt: Instant,

    @Column(nullable = false)
    var updatedAt: Instant = Instant.now(),
) {
    @PrePersist
    @PreUpdate
    fun touch() {
        updatedAt = Instant.now()
    }
}
