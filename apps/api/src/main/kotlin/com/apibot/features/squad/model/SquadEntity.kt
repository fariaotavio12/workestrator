package com.apibot.features.squad.model

import com.fasterxml.jackson.databind.JsonNode
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "squads")
class SquadEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var userId: UUID,

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = false, columnDefinition = "text")
    var description: String = "",

    @Column(nullable = false)
    var icon: String = "",

    @Column(nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var trigger: JsonNode,

    @Column(nullable = false, columnDefinition = "text")
    var orchSystemPrompt: String = "",

    @Column(nullable = true, columnDefinition = "text")
    var savedBriefing: String? = null,

    @Column(nullable = true)
    var orchProviderId: UUID? = null,

    @Column(nullable = true)
    var orchModel: String? = null,

    @Column(nullable = false)
    var orchMaxSteps: Int = 20,

    // `default false` é obrigatório: `ddl-auto=update` não adiciona coluna NOT NULL sem default a uma
    // tabela que já tem linhas.
    @Column(nullable = false, columnDefinition = "boolean default false")
    var orchUseRunHistory: Boolean = false,

    @Column(nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    @Column(nullable = false)
    var updatedAt: Instant = Instant.now(),
) {
    @PrePersist
    fun prePersist() {
        val now = Instant.now()
        createdAt = now
        updatedAt = now
    }

    @PreUpdate
    fun preUpdate() {
        updatedAt = Instant.now()
    }

    fun toDomain(): Squad = Squad(
        id = this.id,
        userId = this.userId,
        name = this.name,
        description = this.description,
        icon = this.icon,
        trigger = this.trigger,
        orchSystemPrompt = this.orchSystemPrompt,
        savedBriefing = this.savedBriefing,
        orchProviderId = this.orchProviderId,
        orchModel = this.orchModel,
        orchMaxSteps = this.orchMaxSteps,
        orchUseRunHistory = this.orchUseRunHistory,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt,
    )
}

fun Squad.toEntity(): SquadEntity = SquadEntity(
    id = this.id,
    userId = this.userId,
    name = this.name,
    description = this.description,
    icon = this.icon,
    trigger = this.trigger,
    orchSystemPrompt = this.orchSystemPrompt,
    savedBriefing = this.savedBriefing,
    orchProviderId = this.orchProviderId,
    orchModel = this.orchModel,
    orchMaxSteps = this.orchMaxSteps,
    orchUseRunHistory = this.orchUseRunHistory,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
