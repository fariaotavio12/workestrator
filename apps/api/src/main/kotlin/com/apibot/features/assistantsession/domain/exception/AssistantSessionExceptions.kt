package com.apibot.features.assistantsession.domain.exception

import com.apibot.shared.exceptions.ForbiddenException
import com.apibot.shared.exceptions.ResourceNotFoundException

class AssistantSessionNotFoundException(
    message: String = "Assistant session not found",
) : ResourceNotFoundException(message)

class AssistantSessionAccessDeniedException(
    message: String = "You do not have access to this assistant session",
) : ForbiddenException(message)
