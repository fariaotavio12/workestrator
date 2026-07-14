package com.apibot.features.oauth.model

import java.time.Instant
import java.util.UUID

/**
 * Cache do access token resolvido de um secret oauth2_* — 1:1 com o secret (chave = o proprio
 * secretId). O refresh token continua na tabela `secrets` (`SecretEntity.valueCiphertext`); esta
 * tabela guarda so o access token de curta duracao, pra `OAuthTokenService` nao re-trocar a cada
 * chamada de `/access-token` dentro da janela de validade dele.
 */
data class OAuthToken(
    val secretId: UUID,
    val accessTokenCiphertext: String,
    val expiresAt: Instant,
    val updatedAt: Instant = Instant.now(),
)

fun OAuthTokenEntity.toDomain(): OAuthToken = OAuthToken(
    secretId = this.secretId,
    accessTokenCiphertext = this.accessTokenCiphertext,
    expiresAt = this.expiresAt,
    updatedAt = this.updatedAt,
)

fun OAuthToken.toEntity(): OAuthTokenEntity = OAuthTokenEntity(
    secretId = this.secretId,
    accessTokenCiphertext = this.accessTokenCiphertext,
    expiresAt = this.expiresAt,
    updatedAt = this.updatedAt,
)
