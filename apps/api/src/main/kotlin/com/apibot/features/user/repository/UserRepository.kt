package com.apibot.features.user.repository

import com.apibot.features.user.model.User
import com.apibot.features.user.model.UserFilter
import com.apibot.shared.extensions.PageRequestParams
import com.apibot.shared.extensions.PageResult
import java.util.UUID

interface UserRepository {
    fun save(user: User): User
    fun findById(id: UUID): User?
    fun findByEmail(email: String): User?
    fun findAll(pageRequest: PageRequestParams = PageRequestParams(), filter: UserFilter = UserFilter()): PageResult<User>
    fun findAllById(ids: Collection<UUID>): List<User>
    fun update(user: User): User
    fun deleteById(id: UUID)
}
