package com.apibot.features.secret.domain.exception

import com.apibot.shared.exceptions.ConflictException
import com.apibot.shared.exceptions.ForbiddenException
import com.apibot.shared.exceptions.ResourceNotFoundException

class SecretNotFoundException(
    message: String = "Secret not found",
) : ResourceNotFoundException(message)

class SecretAccessDeniedException(
    message: String = "You do not have access to this secret",
) : ForbiddenException(message)

class SecretValueNotSetException(
    message: String = "This secret has no value set yet",
) : ConflictException(message)
