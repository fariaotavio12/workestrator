package com.apibot.features.agent.domain.exception

import com.apibot.shared.exceptions.ForbiddenException
import com.apibot.shared.exceptions.ResourceNotFoundException

class AgentNotFoundException(
    message: String = "Agent not found",
) : ResourceNotFoundException(message)

class AgentAccessDeniedException(
    message: String = "You do not have access to this agent",
) : ForbiddenException(message)
