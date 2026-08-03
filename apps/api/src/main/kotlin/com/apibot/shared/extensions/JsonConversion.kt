package com.apibot.shared.extensions

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.databind.node.ArrayNode
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper

/**
 * Small structured sub-fields (lists, logs, tagged unions) stay as opaque jsonb instead of being
 * fully modeled relationally — they are not independently addressable resources. This mapper is the
 * single conversion point between that jsonb and typed Kotlin values in domain/entity mappers.
 *
 * `JavaTimeModule` is **required**, not decorative: from Jackson 2.19 a bare `jacksonObjectMapper()`
 * *throws* on a `java.time` value (`REQUIRE_HANDLERS_FOR_JAVA8_TIMES`) instead of degrading to a numeric
 * shape. `ApprovalItem.decidedAt` was the first temporal value to reach this mapper, and without the module
 * every per-item decision died with a 500 while writing the jsonb — leaving the run paused forever.
 * Registering it is **additive**: no other jsonb payload in the project carries a date/time type, so nothing
 * already persisted changes shape. ISO-8601 (not epoch numbers) keeps it readable and matches the
 * `Instant.toString()` already used in the webhook payload.
 */
val sharedJsonMapper = jacksonObjectMapper()
    .registerModule(JavaTimeModule())
    .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)

/**
 * `T::class.java` erases generic arguments (e.g. `List<ProviderModelOption>` becomes raw `List`),
 * so Jackson would deserialize elements as `LinkedHashMap` instead of the real type. `TypeReference`
 * captures the full reified generic signature instead.
 */
inline fun <reified T> JsonNode.toObject(): T =
    sharedJsonMapper.convertValue(this, object : TypeReference<T>() {})

fun Any.toJsonNode(): JsonNode = sharedJsonMapper.valueToTree(this)

fun emptyJsonArray(): JsonNode = sharedJsonMapper.createArrayNode() as ArrayNode

fun emptyJsonObject(): JsonNode = sharedJsonMapper.createObjectNode()
