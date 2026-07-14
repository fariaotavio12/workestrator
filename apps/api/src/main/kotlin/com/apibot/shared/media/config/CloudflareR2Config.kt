package com.apibot.shared.media.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import java.net.URI

@Configuration
@ConditionalOnProperty(prefix = "app.storage.cloudflare", name = ["enabled"], havingValue = "true")
class CloudflareR2Config(
    @Value("\${app.storage.cloudflare.account-id:}") private val accountId: String,
    @Value("\${app.storage.cloudflare.access-key-id:}") private val accessKey: String,
    @Value("\${app.storage.cloudflare.secret-access-key:}") private val secretKey: String,
    @Value("\${app.storage.cloudflare.region:auto}") private val region: String
) {

    @Bean
    fun s3Client(): S3Client {
        val endpoint = URI.create("https://$accountId.r2.cloudflarestorage.com")
        val credentials = AwsBasicCredentials.create(accessKey, secretKey)
        
        return S3Client.builder()
            .endpointOverride(endpoint)
            .credentialsProvider(StaticCredentialsProvider.create(credentials))
            .region(Region.of(region))
            .build()
    }
}
