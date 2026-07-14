package com.apibot.features.oauth.repository

import com.apibot.features.oauth.model.OAuthToken
import java.util.UUID

interface OAuthTokenRepository {
    fun findBySecretId(secretId: UUID): OAuthToken?
    fun save(token: OAuthToken): OAuthToken
}
