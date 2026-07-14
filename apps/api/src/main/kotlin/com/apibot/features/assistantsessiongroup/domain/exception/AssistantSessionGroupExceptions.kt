package com.apibot.features.assistantsessiongroup.domain.exception

import com.apibot.shared.exceptions.ForbiddenException
import com.apibot.shared.exceptions.ResourceNotFoundException

class AssistantSessionGroupNotFoundException(
    message: String = "Assistant session group not found",
) : ResourceNotFoundException(message)

class AssistantSessionGroupAccessDeniedException(
    message: String = "You do not have access to this assistant session group",
) : ForbiddenException(message)
