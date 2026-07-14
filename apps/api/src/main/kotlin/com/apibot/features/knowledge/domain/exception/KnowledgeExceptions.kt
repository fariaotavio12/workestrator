package com.apibot.features.knowledge.domain.exception

import com.apibot.shared.exceptions.ForbiddenException
import com.apibot.shared.exceptions.ResourceNotFoundException
import com.apibot.shared.exceptions.ServiceUnavailableException

class CollectionNotFoundException(
    message: String = "Knowledge collection not found",
) : ResourceNotFoundException(message)

class CollectionAccessDeniedException(
    message: String = "You do not have access to this knowledge collection",
) : ForbiddenException(message)

class DocumentNotFoundException(
    message: String = "Knowledge document not found",
) : ResourceNotFoundException(message)

class EmbeddingProviderException(
    message: String = "Embedding provider is unavailable",
) : ServiceUnavailableException(message)
