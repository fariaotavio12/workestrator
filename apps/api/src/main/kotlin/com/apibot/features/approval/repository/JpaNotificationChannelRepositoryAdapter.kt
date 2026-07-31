package com.apibot.features.approval.repository

import com.apibot.features.approval.model.NotificationChannel
import com.apibot.features.approval.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaNotificationChannelRepositoryAdapter(
    private val jpaRepository: JpaNotificationChannelRepository,
) : NotificationChannelRepository {
    override fun save(channel: NotificationChannel): NotificationChannel =
        jpaRepository.save(channel.toEntity()).toDomain()

    override fun findById(id: UUID): NotificationChannel? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun findAllByUserId(userId: UUID): List<NotificationChannel> =
        jpaRepository.findAllByUserId(userId).map { it.toDomain() }

    override fun deleteById(id: UUID) = jpaRepository.deleteById(id)
}
