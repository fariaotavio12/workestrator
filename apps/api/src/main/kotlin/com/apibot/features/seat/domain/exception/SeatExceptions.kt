package com.apibot.features.seat.domain.exception

import com.apibot.shared.exceptions.BusinessRuleViolationException
import com.apibot.shared.exceptions.ResourceNotFoundException

class SeatNotFoundException(
    message: String = "Seat not found",
) : ResourceNotFoundException(message)

class InvalidSeatAssignmentException(
    message: String = "Agent does not belong to this squad",
) : BusinessRuleViolationException(message)
