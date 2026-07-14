package com.apibot.shared.exceptions

open class ResourceNotFoundException(
    message: String = "Recurso não encontrado",
) : RuntimeException(message)
