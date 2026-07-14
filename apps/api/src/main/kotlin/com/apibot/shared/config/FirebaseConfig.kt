package com.apibot.shared.config

import com.google.auth.oauth2.GoogleCredentials
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.io.ByteArrayInputStream
import java.io.File
import java.util.Base64

@Configuration
@ConditionalOnExpression(
    "'\${firebase.service-account.path:}'.trim() != '' || '\${firebase.service-account.base64:}'.trim() != ''",
)
class FirebaseConfig(
    @Value("\${firebase.service-account.path:}") private val serviceAccountPath: String,
    @Value("\${firebase.service-account.base64:}") private val serviceAccountBase64: String,
    @Value("\${firebase.storage.bucket:}") private val storageBucket: String,
) {
    private val logger = LoggerFactory.getLogger(FirebaseConfig::class.java)

    @Bean
    fun firebaseApp(): FirebaseApp {
        val credentials = loadCredentials()
        val options = FirebaseOptions.builder()
            .setCredentials(credentials)
            .also {
                if (storageBucket.isNotBlank()) {
                    it.setStorageBucket(storageBucket)
                }
            }
            .build()
        return if (FirebaseApp.getApps().isEmpty()) FirebaseApp.initializeApp(options)
        else FirebaseApp.getInstance()
    }

    private fun loadCredentials(): GoogleCredentials {
        if (serviceAccountBase64.isNotBlank()) {
            val decoded = Base64.getDecoder().decode(serviceAccountBase64)
            return GoogleCredentials.fromStream(ByteArrayInputStream(decoded))
        }

        val file = File(serviceAccountPath)
        require(file.exists() && file.isFile) {
            "Firebase: arquivo de service account nao encontrado em '$serviceAccountPath'"
        }
        return file.inputStream().use { GoogleCredentials.fromStream(it) }
    }
}
