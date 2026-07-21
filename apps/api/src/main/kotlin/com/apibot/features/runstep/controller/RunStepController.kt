package com.apibot.features.runstep.controller

import com.apibot.features.runstep.dto.RunStepRequest
import com.apibot.features.runstep.service.RunStepService
import com.apibot.security.GetUserId
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.util.UUID

@RestController
@RequestMapping("/run-step")
@Tag(name = "RunStep")
@SecurityRequirement(name = "Bearer")
class RunStepController(
    private val runStepService: RunStepService,
) {
    @PostMapping
    @Operation(
        summary = "Execute a single agent turn against an API-key provider, streamed as SSE",
        description =
            "Lets a 100% API-key squad run from the plain web app, without the desktop runner. " +
                "CLI providers (claude-cli/codex-cli/gpt-cli) are rejected — they require a local binary.",
    )
    fun runStep(@GetUserId userId: String, @Valid @RequestBody request: RunStepRequest): SseEmitter =
        runStepService.runStep(UUID.fromString(userId), request)
}
