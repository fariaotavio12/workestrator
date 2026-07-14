package com.apibot.features.oauth.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.client.RestClient

/** Cliente HTTP de saida pra troca de token OAuth2 com providers externos — Spring 6, ja no starter-web. */
@Configuration
class RestClientConfig {
    @Bean
    fun restClient(builder: RestClient.Builder): RestClient = builder.build()
}
