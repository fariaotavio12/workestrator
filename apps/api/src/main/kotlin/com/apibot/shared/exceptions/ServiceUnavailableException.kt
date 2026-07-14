package com.apibot.shared.exceptions

open class ServiceUnavailableException(
    message: String = "Serviço temporariamente indisponível",
) : RuntimeException(message)
