package com.apibot.features.run.domain.exception

import com.apibot.shared.exceptions.ForbiddenException
import com.apibot.shared.exceptions.ResourceNotFoundException

class RunNotFoundException(
    message: String = "Run not found",
) : ResourceNotFoundException(message)

class RunAccessDeniedException(
    message: String = "You do not have access to this run",
) : ForbiddenException(message)
