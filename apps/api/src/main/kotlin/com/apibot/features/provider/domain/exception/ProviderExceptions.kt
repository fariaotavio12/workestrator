package com.apibot.features.provider.domain.exception

import com.apibot.shared.exceptions.ForbiddenException
import com.apibot.shared.exceptions.ResourceNotFoundException

class ProviderNotFoundException(
    message: String = "Provider not found",
) : ResourceNotFoundException(message)

class ProviderAccessDeniedException(
    message: String = "You do not have access to this provider",
) : ForbiddenException(message)
