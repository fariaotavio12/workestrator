package com.apibot.shared.exceptions

open class UnauthorizedException(
    message: String = "Não autorizado",
) : RuntimeException(message)
