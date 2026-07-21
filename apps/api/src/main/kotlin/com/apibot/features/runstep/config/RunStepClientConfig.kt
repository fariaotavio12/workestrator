package com.apibot.features.runstep.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.net.http.HttpClient
import java.time.Duration

/**
 * Outbound HTTP client for calling OpenAI-compatible provider endpoints. Deliberately the raw JDK
 * client, not the app's usual `RestClient` (`features/oauth/config/RestClientConfig.kt`) —
 * `RestClient.retrieve().body()` buffers the whole response, which can't drive an incrementally
 * streamed chat-completions response the way `HttpResponse.BodyHandlers.ofInputStream()` can.
 */
@Configuration
class RunStepClientConfig {
    @Bean
    fun runStepHttpClient(): HttpClient =
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build()
}
