package com.apibot.features.user.repository.specification

import com.apibot.features.user.model.UserEntity
import com.apibot.features.user.model.UserFilter
import org.springframework.data.jpa.domain.Specification

object UserSpecifications {
    fun byFilter(filter: UserFilter): Specification<UserEntity> {
        var specification: Specification<UserEntity> = Specification.where(null)

        filter.name?.trim()?.takeIf { it.isNotBlank() }?.let { name ->
            specification = specification.and { root, _, cb ->
                cb.like(cb.lower(root.get("name")), "%${name.lowercase()}%")
            }
        }

        filter.email?.trim()?.takeIf { it.isNotBlank() }?.let { email ->
            specification = specification.and { root, _, cb ->
                cb.like(cb.lower(root.get("email")), "%${email.lowercase()}%")
            }
        }

        filter.isActive?.let { active ->
            specification = specification.and { root, _, cb ->
                cb.equal(root.get<Boolean>("isActive"), active)
            }
        }

        filter.search?.trim()?.takeIf { it.isNotBlank() }?.let { q ->
            val pattern = "%${q.lowercase()}%"
            specification = specification.and { root, _, cb ->
                cb.or(
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(root.get("email")), pattern),
                )
            }
        }

        return specification
    }
}
