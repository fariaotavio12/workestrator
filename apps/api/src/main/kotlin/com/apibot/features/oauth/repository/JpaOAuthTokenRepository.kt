package com.apibot.features.oauth.repository

import com.apibot.features.oauth.model.OAuthTokenEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaOAuthTokenRepository : JpaRepository<OAuthTokenEntity, UUID>
