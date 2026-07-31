package com.apibot.features.approval.repository

import com.apibot.features.approval.model.NotificationChannelEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaNotificationChannelRepository : JpaRepository<NotificationChannelEntity, UUID> {
    fun findAllByUserId(userId: UUID): List<NotificationChannelEntity>
}
