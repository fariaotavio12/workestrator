package com.apibot.features.health.controller

import io.swagger.v3.oas.annotations.Hidden
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant

data class PingResponse(
    val message: String,
    val timestamp: String,
    val service: String,
    val status: String,
)

@Hidden
@RestController
@RequestMapping(value = ["/public"])
class HealthController {
    @GetMapping("/ping")
    fun ping(): ResponseEntity<PingResponse> = ResponseEntity.ok(
        PingResponse(
            message = "pong",
            timestamp = Instant.now().toString(),
            service = "gainz-api",
            status = "UP",
        )
    )
}
