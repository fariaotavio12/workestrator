package com.apibot.features.user.repository

import com.apibot.features.user.model.User
import com.apibot.features.user.model.UserFilter
import com.apibot.features.user.model.toEntity
import com.apibot.features.user.repository.specification.UserSpecifications
import com.apibot.shared.extensions.PageRequestParams
import com.apibot.shared.extensions.PageResult
import com.apibot.shared.extensions.toPageResult
import org.springframework.context.annotation.Primary
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
@Primary
class JpaUserRepositoryAdapter(
    private val jpaRepository: JpaUserRepository,
) : UserRepository {
    override fun save(user: User): User =
        jpaRepository.save(user.toEntity()).toDomain()

    override fun findById(id: UUID): User? =
        jpaRepository.findById(id).map { it.toDomain() }.orElse(null)

    override fun findByEmail(email: String): User? =
        jpaRepository.findByEmailIgnoreCase(email)?.toDomain()

    override fun findAll(pageRequest: PageRequestParams, filter: UserFilter): PageResult<User> {
        val normalized = pageRequest.normalized()
        val direction = if (filter.sortDesc) Sort.Direction.DESC else Sort.Direction.ASC
        val pageable = PageRequest.of(normalized.page, normalized.size, Sort.by(direction, filter.sortBy))
        val specification = UserSpecifications.byFilter(filter)
        return jpaRepository.findAll(specification, pageable).toPageResult { it.toDomain() }
    }

    override fun findAllById(ids: Collection<UUID>): List<User> =
        jpaRepository.findAllById(ids).map { it.toDomain() }

    override fun update(user: User): User =
        jpaRepository.save(user.toEntity()).toDomain()

    override fun deleteById(id: UUID) =
        jpaRepository.deleteById(id)
}
