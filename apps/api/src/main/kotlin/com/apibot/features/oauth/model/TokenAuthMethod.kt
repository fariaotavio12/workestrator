package com.apibot.features.oauth.model

/** Como client_id/client_secret sao enviados na troca de token — a maioria usa BODY, alguns exigem Basic auth header. */
enum class TokenAuthMethod {
    BODY,
    BASIC,
}
