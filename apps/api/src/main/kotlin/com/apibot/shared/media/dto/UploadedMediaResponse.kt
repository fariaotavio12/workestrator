package com.apibot.shared.media.dto

import com.apibot.shared.media.model.MediaType

data class UploadedMediaResponse(
    val url: String,
    val thumbnailUrl: String? = null,
    val mediaType: MediaType,
)
