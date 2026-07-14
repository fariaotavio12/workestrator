package com.apibot.features.oauth.dto

import com.apibot.features.oauth.model.OAuthProvider
import com.apibot.features.secret.model.SecretAuthType
import io.swagger.v3.oas.annotations.media.Schema
import java.time.Instant

@Schema(description = "Access token OAuth2 resolvido — curta duracao, renovado/rotacionado automaticamente pelo backend")
data class AccessTokenResponse(
    @Schema(description = "Access token valido") val accessToken: String,
    @Schema(description = "Quando o access token expira") val expiresAt: Instant,
)

@Schema(description = "Preset de conector do catalogo — nunca inclui nada sensivel (sem client secret, sem token)")
data class ConnectorResponse(
    @Schema(description = "Id estavel do preset (ex.: \"google\")") val id: String,
    @Schema(description = "Nome de exibicao") val displayName: String,
    @Schema(description = "Chave que o front mapeia pra um icone — o backend nao serve o icone em si") val iconKey: String,
    @Schema(description = "Esquema de autenticacao deste preset") val authType: SecretAuthType,
    @Schema(description = "Presente = suporta o fluxo \"Conectar\" (authorization_code + PKCE)") val authUrl: String?,
    @Schema(description = "Endpoint de troca de token — nao e sensivel (URL publica do provider), o front precisa dele pra completar o fluxo \"Conectar\"") val tokenUrl: String?,
    @Schema(description = "Scopes sugeridos por padrao") val defaultScopes: String?,
)

fun OAuthProvider.toResponse(): ConnectorResponse = ConnectorResponse(
    id = this.id,
    displayName = this.displayName,
    iconKey = this.iconKey,
    authType = this.authType,
    authUrl = this.authUrl,
    tokenUrl = this.tokenUrl,
    defaultScopes = this.defaultScopes,
)
