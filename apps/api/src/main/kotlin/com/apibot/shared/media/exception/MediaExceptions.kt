package com.apibot.shared.media.exception

import com.apibot.shared.exceptions.BusinessRuleViolationException

class InvalidMediaTypeException(message: String) : BusinessRuleViolationException(message)

class MediaSizeExceededException(message: String) : BusinessRuleViolationException(message)

class MediaUploadException(message: String) : BusinessRuleViolationException(message)
