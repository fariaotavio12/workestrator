package com.apibot.shared.exceptions

open class ForbiddenException(
    message: String = "Acesso negado",
) : RuntimeException(message)
