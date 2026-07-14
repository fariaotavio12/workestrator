package com.apibot.features.squad.domain.exception

import com.apibot.shared.exceptions.ForbiddenException
import com.apibot.shared.exceptions.ResourceNotFoundException

class SquadNotFoundException(
    message: String = "Squad not found",
) : ResourceNotFoundException(message)

class SquadAccessDeniedException(
    message: String = "You do not have access to this squad",
) : ForbiddenException(message)
