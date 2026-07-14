package com.apibot.features.user.service

import com.apibot.features.user.domain.exception.UserAlreadyExistsException
import com.apibot.features.user.domain.exception.UserNotFoundException
import com.apibot.features.user.model.User
import com.apibot.features.user.model.UserFilter
import com.apibot.features.user.repository.UserRepository
import com.apibot.features.user.dto.CreateUserRequest
import com.apibot.features.user.dto.UpdateUserRequest
import com.apibot.shared.extensions.PageRequestParams
import com.apibot.shared.extensions.PageResult
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

@Service
class UserService(
    private val userRepository: UserRepository,
) {
    fun createUser(request: CreateUserRequest): User {
        if (userRepository.findByEmail(request.email) != null) {
            throw UserAlreadyExistsException(request.email)
        }

        val user = User(
            name = request.name,
            email = request.email,
        )

        return userRepository.save(user)
    }

    fun getUserById(id: UUID): User =
        userRepository.findById(id)
            ?: throw UserNotFoundException("User with ID '$id' not found")

    fun getUserByEmail(email: String): User =
        userRepository.findByEmail(email)
            ?: throw UserNotFoundException("User with email '$email' not found")

    fun listUsers(
        pageRequest: PageRequestParams = PageRequestParams(),
        filter: UserFilter = UserFilter(),
    ): PageResult<User> = userRepository.findAll(pageRequest, filter)

    fun updateUser(id: UUID, request: UpdateUserRequest): User {
        val current = getUserById(id)

        val updated = current.copy(
            name = request.name ?: current.name,
            isActive = request.isActive ?: current.isActive,
            img = request.img ?: current.img,
            updatedAt = Instant.now(),
        )

        return userRepository.update(updated)
    }

    fun deleteUser(id: UUID) {
        getUserById(id)
        userRepository.deleteById(id)
    }

    fun activateUser(id: UUID): User {
        val current = getUserById(id)
        return userRepository.update(current.copy(isActive = true, updatedAt = Instant.now()))
    }

    fun deactivateUser(id: UUID): User {
        val current = getUserById(id)
        return userRepository.update(current.copy(isActive = false, updatedAt = Instant.now()))
    }
}
