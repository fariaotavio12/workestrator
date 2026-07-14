package com.apibot.features.secret.crypto

import org.springframework.boot.context.properties.ConfigurationProperties

/** Master key (base64, 32 bytes) for `SecretCipher` — sourced from `SECRETS_MASTER_KEY`, never committed. */
@ConfigurationProperties(prefix = "app.secrets")
data class SecretCryptoProperties(
    var masterKey: String = "",
)
