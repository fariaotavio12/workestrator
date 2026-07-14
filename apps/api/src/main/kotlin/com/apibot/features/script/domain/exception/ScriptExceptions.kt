package com.apibot.features.script.domain.exception

import com.apibot.shared.exceptions.BusinessRuleViolationException
import com.apibot.shared.exceptions.ForbiddenException
import com.apibot.shared.exceptions.ResourceNotFoundException

class ScriptNotFoundException(
    message: String = "Script not found",
) : ResourceNotFoundException(message)

class ScriptAccessDeniedException(
    message: String = "You do not have access to this script",
) : ForbiddenException(message)

class InvalidScriptException(
    message: String = "Invalid script data",
) : BusinessRuleViolationException(message)
