package com.apibot.features.run.model

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.ArrayNode
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

private val emptyArrayNode: JsonNode = jacksonObjectMapper().createArrayNode() as ArrayNode

@Entity
@Table(name = "runs")
class RunEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var squadId: UUID,

    @Column(nullable = false)
    var userId: UUID,

    @Column(nullable = false, columnDefinition = "text")
    var input: String = "",

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    var status: RunStatus = RunStatus.RUNNING,

    @Column(nullable = false)
    var startedAt: Instant = Instant.now(),

    @Column(nullable = true)
    var endedAt: Instant? = null,

    @Column(nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var steps: JsonNode = emptyArrayNode,

    @Column(nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var qaLog: JsonNode = emptyArrayNode,

    @Column(nullable = true)
    var resumedFromRunId: UUID? = null,

    @Column(nullable = true, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var runtimeSnapshot: JsonNode? = null,

    @Column(nullable = false, columnDefinition = "jsonb default '[]'::jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var authBindingsSnapshot: JsonNode = emptyArrayNode,

    // `default '[]'::jsonb` é obrigatório: `ddl-auto=update` não adiciona coluna NOT NULL sem default a
    // uma tabela que já tem linhas (mesmo padrão de AgentEntity.knowledgeCollectionIds).
    @Column(nullable = false, columnDefinition = "jsonb default '[]'::jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var files: JsonNode = emptyArrayNode,
) {
    fun toDomain(): Run = Run(
        id = this.id,
        squadId = this.squadId,
        userId = this.userId,
        input = this.input,
        status = this.status,
        startedAt = this.startedAt,
        endedAt = this.endedAt,
        steps = this.steps,
        qaLog = this.qaLog,
        resumedFromRunId = this.resumedFromRunId,
        runtimeSnapshot = this.runtimeSnapshot,
        authBindingsSnapshot = this.authBindingsSnapshot,
        files = this.files,
    )
}

fun Run.toEntity(): RunEntity = RunEntity(
    id = this.id,
    squadId = this.squadId,
    userId = this.userId,
    input = this.input,
    status = this.status,
    startedAt = this.startedAt,
    endedAt = this.endedAt,
    steps = this.steps,
    qaLog = this.qaLog,
    resumedFromRunId = this.resumedFromRunId,
    runtimeSnapshot = this.runtimeSnapshot,
    authBindingsSnapshot = this.authBindingsSnapshot,
    files = this.files,
)
