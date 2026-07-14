package com.apibot.features.script.model

import com.apibot.shared.extensions.toJsonNode
import com.apibot.shared.extensions.toObject
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

private val emptyArgsNode: JsonNode = jacksonObjectMapper().createArrayNode()

@Entity
@Table(name = "scripts")
class ScriptEntity(
    @Id
    var id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var userId: UUID,

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = true)
    var description: String? = null,

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    var kind: ScriptKind = ScriptKind.COMMAND,

    @Column(nullable = true)
    var command: String? = null,

    @Column(nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var args: JsonNode = emptyArgsNode,

    @Column(nullable = true)
    var language: String? = null,

    @Column(nullable = true, columnDefinition = "text")
    var content: String? = null,

    @Column(nullable = true)
    var path: String? = null,

    @Column(nullable = true)
    @Enumerated(EnumType.STRING)
    var method: ScriptHttpMethod? = null,

    @Column(nullable = true)
    var urlTemplate: String? = null,

    @Column(nullable = true, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var headers: JsonNode? = null,

    @Column(nullable = true, columnDefinition = "text")
    var bodySchema: String? = null,

    @Column(nullable = true, columnDefinition = "text")
    var responseMap: String? = null,

    @Column(nullable = true)
    @Enumerated(EnumType.STRING)
    var transport: McpTransport? = null,

    @Column(nullable = true)
    var url: String? = null,

    @Column(nullable = true, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var env: JsonNode? = null,

    @Column(nullable = true, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var toolAllowlist: JsonNode? = null,

    @Column(nullable = true)
    @Enumerated(EnumType.STRING)
    var connectorProvider: ConnectorProvider? = null,

    @Column(nullable = true, columnDefinition = "text")
    var config: String? = null,

    @Column(nullable = true)
    var authRef: String? = null,

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

    fun toDomain(): Script = Script(
        id = this.id,
        userId = this.userId,
        name = this.name,
        description = this.description,
        kind = this.kind,
        command = this.command,
        args = this.args.toObject(),
        language = this.language,
        content = this.content,
        path = this.path,
        method = this.method,
        urlTemplate = this.urlTemplate,
        headers = this.headers?.toObject(),
        bodySchema = this.bodySchema,
        responseMap = this.responseMap,
        transport = this.transport,
        url = this.url,
        env = this.env?.toObject(),
        toolAllowlist = this.toolAllowlist?.toObject(),
        connectorProvider = this.connectorProvider,
        config = this.config,
        authRef = this.authRef,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt,
    )
}

fun Script.toEntity(): ScriptEntity = ScriptEntity(
    id = this.id,
    userId = this.userId,
    name = this.name,
    description = this.description,
    kind = this.kind,
    command = this.command,
    args = this.args.toJsonNode(),
    language = this.language,
    content = this.content,
    path = this.path,
    method = this.method,
    urlTemplate = this.urlTemplate,
    headers = this.headers?.toJsonNode(),
    bodySchema = this.bodySchema,
    responseMap = this.responseMap,
    transport = this.transport,
    url = this.url,
    env = this.env?.toJsonNode(),
    toolAllowlist = this.toolAllowlist?.toJsonNode(),
    connectorProvider = this.connectorProvider,
    config = this.config,
    authRef = this.authRef,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
)
