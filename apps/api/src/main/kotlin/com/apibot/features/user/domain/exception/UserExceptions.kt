package com.apibot.features.user.domain.exception

import com.apibot.shared.exceptions.BusinessRuleViolationException
import com.apibot.shared.exceptions.ConflictException
import com.apibot.shared.exceptions.ResourceNotFoundException

class UserAlreadyExistsException(
    email: String,
) : ConflictException("User with email '$email' already exists")

class UserNotFoundException(
    message: String = "User not found",
) : ResourceNotFoundException(message)

class InvalidUserException(
    message: String = "Invalid user data",
) : BusinessRuleViolationException(message)
