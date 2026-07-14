package com.apibot.features.squadshare.repository

import com.apibot.features.squadshare.model.SquadShare
import com.apibot.features.squadshare.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository

@Repository
@Primary
class JpaSquadShareRepositoryAdapter(
    private val jpaRepository: JpaSquadShareRepository,
) : SquadShareRepository {
    override fun save(share: SquadShare): SquadShare =
        jpaRepository.save(share.toEntity()).toDomain()

    override fun findByToken(token: String): SquadShare? =
        jpaRepository.findByToken(token)?.toDomain()

    override fun update(share: SquadShare): SquadShare =
        jpaRepository.save(share.toEntity()).toDomain()
}
