package com.apibot.features.script.service

import com.apibot.features.script.domain.exception.InvalidScriptException
import com.apibot.features.script.domain.exception.ScriptAccessDeniedException
import com.apibot.features.script.domain.exception.ScriptNotFoundException
import com.apibot.features.script.dto.CreateScriptRequest
import com.apibot.features.script.dto.UpdateScriptRequest
import com.apibot.features.script.model.McpTransport
import com.apibot.features.script.model.Script
import com.apibot.features.script.model.ScriptKind
import com.apibot.features.script.repository.ScriptRepository
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

@Service
class ScriptService(
    private val scriptRepository: ScriptRepository,
) {
    fun createScript(userId: UUID, request: CreateScriptRequest): Script {
        validateKindFields(
            kind = request.kind,
            path = request.path,
            urlTemplate = request.urlTemplate,
            transport = request.transport,
            command = request.command,
            url = request.url,
            connectorProvider = request.connectorProvider,
        )

        val script = Script(
            userId = userId,
            name = request.name,
            description = request.description,
            kind = request.kind,
            command = request.command,
            args = request.args,
            language = request.language,
            content = request.content,
            path = request.path,
            method = request.method,
            urlTemplate = request.urlTemplate,
            headers = request.headers,
            bodySchema = request.bodySchema,
            responseMap = request.responseMap,
            transport = request.transport,
            url = request.url,
            env = request.env,
            toolAllowlist = request.toolAllowlist,
            connectorProvider = request.connectorProvider,
            config = request.config,
            authRef = request.authRef,
        )
        return scriptRepository.save(script)
    }

    fun listScripts(userId: UUID): List<Script> =
        scriptRepository.findAllByUserId(userId)

    fun getScriptForUser(userId: UUID, id: UUID): Script {
        val script = scriptRepository.findById(id) ?: throw ScriptNotFoundException()
        if (script.userId != userId) throw ScriptAccessDeniedException()
        return script
    }

    fun updateScript(userId: UUID, id: UUID, request: UpdateScriptRequest): Script {
        val current = getScriptForUser(userId, id)
        val kind = request.kind ?: current.kind
        val path = request.path ?: current.path
        val urlTemplate = request.urlTemplate ?: current.urlTemplate
        val transport = request.transport ?: current.transport
        val command = request.command ?: current.command
        val url = request.url ?: current.url
        val connectorProvider = request.connectorProvider ?: current.connectorProvider
        validateKindFields(
            kind = kind,
            path = path,
            urlTemplate = urlTemplate,
            transport = transport,
            command = command,
            url = url,
            connectorProvider = connectorProvider,
        )

        val updated = current.copy(
            name = request.name ?: current.name,
            description = request.description ?: current.description,
            kind = kind,
            command = command,
            args = request.args ?: current.args,
            language = request.language ?: current.language,
            content = request.content ?: current.content,
            path = path,
            method = request.method ?: current.method,
            urlTemplate = urlTemplate,
            headers = request.headers ?: current.headers,
            bodySchema = request.bodySchema ?: current.bodySchema,
            responseMap = request.responseMap ?: current.responseMap,
            transport = transport,
            url = url,
            env = request.env ?: current.env,
            toolAllowlist = request.toolAllowlist ?: current.toolAllowlist,
            connectorProvider = connectorProvider,
            config = request.config ?: current.config,
            authRef = request.authRef ?: current.authRef,
            updatedAt = Instant.now(),
        )
        return scriptRepository.update(updated)
    }

    fun deleteScript(userId: UUID, id: UUID) {
        getScriptForUser(userId, id)
        scriptRepository.deleteById(id)
    }

    private fun validateKindFields(
        kind: ScriptKind,
        path: String?,
        urlTemplate: String?,
        transport: McpTransport?,
        command: String?,
        url: String?,
        connectorProvider: Any?,
    ) {
        if (kind == ScriptKind.FILE && path.isNullOrBlank()) {
            throw InvalidScriptException("Path is required for scripts of kind 'file'")
        }
        if (kind == ScriptKind.HTTP && urlTemplate.isNullOrBlank()) {
            throw InvalidScriptException("urlTemplate is required for scripts of kind 'http'")
        }
        if (kind == ScriptKind.MCP && transport == McpTransport.STDIO && command.isNullOrBlank()) {
            throw InvalidScriptException("command is required for scripts of kind 'mcp' with transport 'stdio'")
        }
        if (kind == ScriptKind.MCP && transport == McpTransport.HTTP && url.isNullOrBlank()) {
            throw InvalidScriptException("url is required for scripts of kind 'mcp' with transport 'http'")
        }
        if (kind == ScriptKind.CONNECTOR && connectorProvider == null) {
            throw InvalidScriptException("connectorProvider is required for scripts of kind 'connector'")
        }
    }
}
