package com.apibot.features.auth.domain.exception

import com.apibot.shared.exceptions.UnauthorizedException

class InvalidCredentialsException : UnauthorizedException("Invalid email or password")
