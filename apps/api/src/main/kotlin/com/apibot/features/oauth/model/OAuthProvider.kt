package com.apibot.features.oauth.model

import com.apibot.features.secret.model.SecretAuthType

/**
 * Preset declarativo de uma plataforma OAuth — ver docs/plano-oauth-backend-token-lifecycle.md no
 * front (`front-workestrador/docs/`). Quirks de cada provider (`extraAuthParams`, `tokenAuthMethod`,
 * `noRefresh`...) sao dado, nao codigo: uma plataforma nova que siga o grant_type=refresh_token padrao
 * so precisa de uma entrada em `OAuthProviderCatalog`, nao de uma `TokenStrategy` nova.
 */
data class OAuthProvider(
    val id: String,
    val displayName: String,
    /** O front mapeia isto pra um icone lucide — o backend nunca serve o icone em si. */
    val iconKey: String,
    val authType: SecretAuthType,
    /** null = nao e OAuth (ex.: Composio, que usa uma key estatica em vez de authorization_code). */
    val authUrl: String? = null,
    val tokenUrl: String? = null,
    val defaultScopes: String? = null,
    /** Parametros extras na URL de autorizacao — ex. Google `access_type=offline&prompt=consent`. */
    val extraAuthParams: Map<String, String> = emptyMap(),
    val tokenAuthMethod: TokenAuthMethod = TokenAuthMethod.BODY,
    /** Forca `Accept: application/json` na troca de token (GitHub devolve form-encoded por padrao). */
    val tokenAcceptJson: Boolean = false,
    /** Token nunca expira (Slack bot token, GitHub OAuth App, Notion) — nao ha refresh a fazer. */
    val noRefresh: Boolean = false,
    /** URL de auth/token tem um placeholder de tenant/instance (Microsoft, Salesforce) — informativo. */
    val tenantPlaceholder: Boolean = false,
    /** "standard" cobre o grant padrao; um id diferente aponta pra uma `TokenStrategy` dedicada. */
    val strategy: String = "standard",
)
