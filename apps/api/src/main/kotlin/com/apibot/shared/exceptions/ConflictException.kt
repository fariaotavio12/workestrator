package com.apibot.shared.exceptions

open class ConflictException(
    message: String = "Conflito ao processar a requisição",
) : RuntimeException(message)
