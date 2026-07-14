package com.apibot.shared.exceptions

import java.time.Instant

data class ApiErrorResponse(
    val timestamp: Instant,
    val status: Int,
    val error: String,
    val message: String,
    val path: String,
    val traceId: String?,
    val details: List<String>? = null,
)
