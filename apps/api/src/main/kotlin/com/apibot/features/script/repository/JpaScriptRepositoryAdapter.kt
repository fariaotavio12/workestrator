package com.apibot.features.script.repository

import com.apibot.features.script.model.Script
import com.apibot.features.script.model.toEntity
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaScriptRepositoryAdapter(
    private val jpaRepository: JpaScriptRepository,
) : ScriptRepository {
    override fun save(script: Script): Script =
        jpaRepository.save(script.toEntity()).toDomain()

    override fun findById(id: UUID): Script? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun findAllByUserId(userId: UUID): List<Script> =
        jpaRepository.findAllByUserId(userId).map { it.toDomain() }

    override fun findAllById(ids: Collection<UUID>): List<Script> =
        jpaRepository.findAllById(ids).map { it.toDomain() }

    override fun update(script: Script): Script =
        jpaRepository.save(script.toEntity()).toDomain()

    override fun deleteById(id: UUID) =
        jpaRepository.deleteById(id)
}
