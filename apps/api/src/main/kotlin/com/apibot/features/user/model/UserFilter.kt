package com.apibot.features.user.model

data class UserFilter(
    val name: String? = null,
    val email: String? = null,
    val isActive: Boolean? = null,
    val search: String? = null,
    val sortBy: String = "createdAt",
    val sortDesc: Boolean = true,
)
