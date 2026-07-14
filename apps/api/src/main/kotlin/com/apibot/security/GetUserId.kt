package com.apibot.security

import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder

@Target(AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
annotation class GetUserId

fun resolveUserId(): String {
    val authentication: Authentication = SecurityContextHolder.getContext().authentication
    return authentication.name ?: throw IllegalStateException("User not authenticated")
}
