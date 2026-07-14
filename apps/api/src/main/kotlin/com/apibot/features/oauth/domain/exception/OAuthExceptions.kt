package com.apibot.features.oauth.domain.exception

import com.apibot.shared.exceptions.BusinessRuleViolationException
import com.apibot.shared.exceptions.ServiceUnavailableException

class UnsupportedOAuthSecretException(
    message: String = "This secret's auth type does not support OAuth2 access token exchange",
) : BusinessRuleViolationException(message)

class OAuthTokenExchangeException(
    message: String,
) : ServiceUnavailableException(message)
