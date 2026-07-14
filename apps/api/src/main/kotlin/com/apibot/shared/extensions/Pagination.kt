package com.apibot.shared.extensions

import org.springframework.data.domain.Page

data class PageRequestParams(
    val page: Int = 0,
    val size: Int = 20,
) {
    fun normalized(maxSize: Int = 100): PageRequestParams = PageRequestParams(
        page = page.coerceAtLeast(0),
        size = size.coerceIn(1, maxSize),
    )
}

data class PageResult<T>(
    val data: List<T>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val hasNext: Boolean,
    val hasPrevious: Boolean,
)

fun <T, R> PageResult<T>.map(mapper: (T) -> R): PageResult<R> = PageResult(
    data = data.map(mapper),
    page = page,
    size = size,
    totalElements = totalElements,
    totalPages = totalPages,
    hasNext = hasNext,
    hasPrevious = hasPrevious,
)

fun <T, R> Page<T>.toPageResult(mapper: (T) -> R): PageResult<R> = PageResult(
    data = content.map(mapper),
    page = number,
    size = size,
    totalElements = totalElements,
    totalPages = totalPages,
    hasNext = hasNext(),
    hasPrevious = hasPrevious(),
)
