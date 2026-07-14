package com.apibot.features.oauth.catalog

import com.apibot.features.oauth.model.OAuthProvider
import com.apibot.features.oauth.model.TokenAuthMethod
import com.apibot.features.secret.model.SecretAuthType

/**
 * Catalogo declarativo de plataformas OAuth — ver docs/plano-oauth-backend-token-lifecycle.md (no
 * repo front, `front-workestrador/docs/`). Endpoints sao do conhecimento geral, nao de uma consulta ao
 * vivo — providers de OAuth mudam endpoint/escopo ocasionalmente (ja aconteceu com Microsoft e
 * Atlassian): reconferir contra a doc oficial se algum parar de autenticar.
 *
 * Adicionar uma plataforma nova que siga o grant_type=refresh_token padrao (RFC 6749) e so uma
 * entrada aqui — nao precisa de `TokenStrategy` nova (ver `StandardTokenStrategy`).
 */
object OAuthProviderCatalog {
    val providers: List<OAuthProvider> = listOf(
        // Grupo A — OAuth2 padrao (so dado)
        OAuthProvider(
            id = "google",
            displayName = "Google",
            iconKey = "google",
            authType = SecretAuthType.OAUTH2_REFRESH,
            authUrl = "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl = "https://oauth2.googleapis.com/token",
            defaultScopes = "https://www.googleapis.com/auth/spreadsheets",
            extraAuthParams = mapOf("access_type" to "offline", "prompt" to "consent"),
        ),
        OAuthProvider(
            id = "microsoft",
            displayName = "Microsoft",
            iconKey = "microsoft",
            authType = SecretAuthType.OAUTH2_REFRESH,
            authUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            defaultScopes = "offline_access",
            tenantPlaceholder = true,
        ),
        OAuthProvider(
            id = "atlassian",
            displayName = "Atlassian",
            iconKey = "atlassian",
            authType = SecretAuthType.OAUTH2_REFRESH,
            authUrl = "https://auth.atlassian.com/authorize",
            tokenUrl = "https://auth.atlassian.com/oauth/token",
            extraAuthParams = mapOf("audience" to "api.atlassian.com", "prompt" to "consent"),
        ),
        OAuthProvider(
            id = "discord",
            displayName = "Discord",
            iconKey = "discord",
            authType = SecretAuthType.OAUTH2_REFRESH,
            authUrl = "https://discord.com/oauth2/authorize",
            tokenUrl = "https://discord.com/api/oauth2/token",
        ),
        OAuthProvider(
            id = "dropbox",
            displayName = "Dropbox",
            iconKey = "dropbox",
            authType = SecretAuthType.OAUTH2_REFRESH,
            authUrl = "https://www.dropbox.com/oauth2/authorize",
            tokenUrl = "https://api.dropboxapi.com/oauth2/token",
            extraAuthParams = mapOf("token_access_type" to "offline"),
        ),
        OAuthProvider(
            id = "hubspot",
            displayName = "HubSpot",
            iconKey = "hubspot",
            authType = SecretAuthType.OAUTH2_REFRESH,
            authUrl = "https://app.hubspot.com/oauth/authorize",
            tokenUrl = "https://api.hubapi.com/oauth/v1/token",
        ),
        OAuthProvider(
            id = "linear",
            displayName = "Linear",
            iconKey = "linear",
            authType = SecretAuthType.OAUTH2_REFRESH,
            authUrl = "https://linear.app/oauth/authorize",
            tokenUrl = "https://api.linear.app/oauth/token",
        ),
        OAuthProvider(
            id = "asana",
            displayName = "Asana",
            iconKey = "asana",
            authType = SecretAuthType.OAUTH2_REFRESH,
            authUrl = "https://app.asana.com/-/oauth_authorize",
            tokenUrl = "https://app.asana.com/-/oauth_token",
        ),
        OAuthProvider(
            id = "salesforce",
            displayName = "Salesforce",
            iconKey = "salesforce",
            authType = SecretAuthType.OAUTH2_REFRESH,
            authUrl = "https://login.salesforce.com/services/oauth2/authorize",
            tokenUrl = "https://login.salesforce.com/services/oauth2/token",
            tenantPlaceholder = true,
        ),

        // Grupo B — 1 flag declarativo
        OAuthProvider(
            id = "spotify",
            displayName = "Spotify",
            iconKey = "spotify",
            authType = SecretAuthType.OAUTH2_REFRESH,
            authUrl = "https://accounts.spotify.com/authorize",
            tokenUrl = "https://accounts.spotify.com/api/token",
            tokenAuthMethod = TokenAuthMethod.BASIC,
        ),
        OAuthProvider(
            id = "zoom",
            displayName = "Zoom",
            iconKey = "zoom",
            authType = SecretAuthType.OAUTH2_REFRESH,
            authUrl = "https://zoom.us/oauth/authorize",
            tokenUrl = "https://zoom.us/oauth/token",
            tokenAuthMethod = TokenAuthMethod.BASIC,
        ),
        OAuthProvider(
            id = "slack",
            displayName = "Slack",
            iconKey = "slack",
            authType = SecretAuthType.OAUTH2_REFRESH,
            authUrl = "https://slack.com/oauth/v2/authorize",
            tokenUrl = "https://slack.com/api/oauth.v2.access",
            noRefresh = true,
        ),
        OAuthProvider(
            id = "github",
            displayName = "GitHub",
            iconKey = "github",
            authType = SecretAuthType.OAUTH2_REFRESH,
            authUrl = "https://github.com/login/oauth/authorize",
            tokenUrl = "https://github.com/login/oauth/access_token",
            tokenAcceptJson = true,
            noRefresh = true,
        ),
        OAuthProvider(
            id = "notion",
            displayName = "Notion",
            iconKey = "notion",
            authType = SecretAuthType.OAUTH2_REFRESH,
            authUrl = "https://api.notion.com/v1/oauth/authorize",
            tokenUrl = "https://api.notion.com/v1/oauth/token",
            tokenAuthMethod = TokenAuthMethod.BASIC,
            noRefresh = true,
        ),

        // Grupo C — estrategia dedicada (ver InstagramTokenStrategy)
        OAuthProvider(
            id = "instagram",
            displayName = "Instagram",
            iconKey = "instagram",
            authType = SecretAuthType.OAUTH2_REFRESH,
            authUrl = "https://www.instagram.com/oauth/authorize",
            tokenUrl = "https://api.instagram.com/oauth/access_token",
            defaultScopes = "instagram_business_basic",
            strategy = "instagram",
        ),

        // Grupo D — nao-OAuth (sem authUrl -> front nao oferece "Conectar", so colar o valor manual)
        OAuthProvider(
            id = "composio",
            displayName = "Composio",
            iconKey = "composio",
            authType = SecretAuthType.HEADER,
        ),
    )

    fun findById(id: String): OAuthProvider? = providers.firstOrNull { it.id == id }
}
