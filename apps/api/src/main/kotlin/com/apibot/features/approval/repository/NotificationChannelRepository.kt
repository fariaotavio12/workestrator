package com.apibot.features.approval.repository

import com.apibot.features.approval.model.NotificationChannel
import java.util.UUID

interface NotificationChannelRepository {
    fun save(channel: NotificationChannel): NotificationChannel
    fun findById(id: UUID): NotificationChannel?
    fun findAllByUserId(userId: UUID): List<NotificationChannel>
    fun deleteById(id: UUID)
}
