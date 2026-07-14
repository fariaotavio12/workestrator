package com.apibot.features.secret.crypto

import org.springframework.stereotype.Component
import java.security.SecureRandom
import java.util.Base64
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

private const val ALGO = "AES/GCM/NoPadding"
private const val GCM_IV_LENGTH_BYTES = 12
private const val GCM_TAG_LENGTH_BITS = 128
private const val HKDF_INFO = "workestrador-secret-v1"
private const val CIPHERTEXT_VERSION = "v1"

/**
 * AES-256-GCM at rest for `Secret.valueCiphertext` — the first encryption mechanism in this backend
 * (see docs/plano-integracoes-e-flow-builder.md §8.2). The master key never touches the DB/repo; it's
 * read from `SECRETS_MASTER_KEY` (32 raw bytes, base64). A per-user AES key is derived via HKDF-SHA256
 * (salt = userId, info = "workestrador-secret-v1") so a single leaked derived key doesn't expose every
 * user's secrets — the master key itself would still be required.
 */
@Component
class SecretCipher(
    private val properties: SecretCryptoProperties,
) {
    private val secureRandom = SecureRandom()

    fun encrypt(userId: UUID, plaintext: String): String {
        val key = deriveUserKey(userId)
        val iv = ByteArray(GCM_IV_LENGTH_BYTES).also(secureRandom::nextBytes)
        val cipher = Cipher.getInstance(ALGO)
        cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv))
        val ciphertext = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
        return listOf(CIPHERTEXT_VERSION, encode(iv), encode(ciphertext)).joinToString(":")
    }

    fun decrypt(userId: UUID, stored: String): String {
        val parts = stored.split(":")
        require(parts.size == 3 && parts[0] == CIPHERTEXT_VERSION) { "Unsupported secret ciphertext format" }
        val iv = decode(parts[1])
        val ciphertext = decode(parts[2])
        val key = deriveUserKey(userId)
        val cipher = Cipher.getInstance(ALGO)
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv))
        return String(cipher.doFinal(ciphertext), Charsets.UTF_8)
    }

    private fun deriveUserKey(userId: UUID): SecretKeySpec {
        val masterKey = decodeMasterKey()
        val salt = userId.toString().toByteArray(Charsets.UTF_8)
        val prk = hmacSha256(salt, masterKey)
        val okm = hmacSha256(prk, HKDF_INFO.toByteArray(Charsets.UTF_8) + byteArrayOf(0x01))
        return SecretKeySpec(okm, "AES")
    }

    private fun decodeMasterKey(): ByteArray {
        check(properties.masterKey.isNotBlank()) {
            "SECRETS_MASTER_KEY não configurada — necessária para criar/resolver secrets."
        }
        val decoded = decode(properties.masterKey)
        check(decoded.size == 32) { "SECRETS_MASTER_KEY deve ter 32 bytes (base64 de uma chave AES-256)." }
        return decoded
    }

    private fun hmacSha256(key: ByteArray, data: ByteArray): ByteArray {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(key, "HmacSHA256"))
        return mac.doFinal(data)
    }

    private fun encode(bytes: ByteArray): String = Base64.getEncoder().encodeToString(bytes)

    private fun decode(value: String): ByteArray = Base64.getDecoder().decode(value)
}
