package com.apibot.features.runstep.service

import com.apibot.features.provider.model.ProviderKind
import com.apibot.features.runstep.dto.RunStepRequest
import com.apibot.features.runstep.service.integration.OpenAiCompatExecutor
import com.apibot.shared.exceptions.BusinessRuleViolationException
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.util.UUID
import java.util.concurrent.Executor
import java.util.concurrent.Executors

private val CLI_PROVIDER_KINDS = setOf(ProviderKind.CLAUDE_CLI, ProviderKind.CODEX_CLI, ProviderKind.GPT_CLI)
private const val SSE_TIMEOUT_MS = 10 * 60 * 1000L

/**
 * Lets a squad made entirely of API-key providers execute from the plain web app — no Electron, no
 * local binary. Validates up front (synchronously, so a rejection comes back as a normal JSON error
 * the same way `AgentCallError` does today) then hands the actual HTTP-calling work to a virtual
 * thread so the controller can return the `SseEmitter` immediately.
 */
@Service
class RunStepService(
    private val openAiCompatExecutor: OpenAiCompatExecutor,
) {
    private val logger = LoggerFactory.getLogger(RunStepService::class.java)
    private val executor: Executor = Executors.newVirtualThreadPerTaskExecutor()

    fun runStep(userId: UUID, request: RunStepRequest): SseEmitter {
        if (request.providerKind in CLI_PROVIDER_KINDS) {
            throw BusinessRuleViolationException(
                "Provider \"${request.providerKind.value}\" exige binário local e só executa no app desktop.",
            )
        }
        if (request.providerKind == ProviderKind.ANTHROPIC_API) {
            throw BusinessRuleViolationException(
                "Execução direta via Anthropic API ainda não é suportada — use um provider OpenAI-compatível.",
            )
        }
        if (request.baseUrl.isNullOrBlank()) {
            throw BusinessRuleViolationException("Informe a Base URL do provider.")
        }

        val emitter = SseEmitter(SSE_TIMEOUT_MS)
        executor.execute {
            try {
                openAiCompatExecutor.execute(userId, request, emitter)
            } catch (ex: Exception) {
                logger.error("Falha inesperada ao executar o passo do agent", ex)
                runCatching { emitter.completeWithError(ex) }
            }
        }
        return emitter
    }
}
