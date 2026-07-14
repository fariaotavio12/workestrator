package com.apibot.features.squadshare.domain.exception

import com.apibot.shared.exceptions.ConflictException
import com.apibot.shared.exceptions.ForbiddenException
import com.apibot.shared.exceptions.ResourceNotFoundException

class SquadShareNotFoundException(
    message: String = "Share link not found",
) : ResourceNotFoundException(message)

class SquadShareAccessDeniedException(
    message: String = "You do not have access to this share link",
) : ForbiddenException(message)

class SquadShareRevokedException(
    message: String = "This share link has been revoked",
) : ConflictException(message)
