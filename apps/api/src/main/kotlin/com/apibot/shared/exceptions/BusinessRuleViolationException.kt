package com.apibot.shared.exceptions

open class BusinessRuleViolationException(
    message: String = "Regra de negócio violada",
) : RuntimeException(message)
