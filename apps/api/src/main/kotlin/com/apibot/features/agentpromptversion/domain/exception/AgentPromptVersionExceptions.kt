package com.apibot.features.agentpromptversion.domain.exception

import com.apibot.shared.exceptions.ResourceNotFoundException

class AgentPromptVersionNotFoundException(
    message: String = "Prompt version not found",
) : ResourceNotFoundException(message)
