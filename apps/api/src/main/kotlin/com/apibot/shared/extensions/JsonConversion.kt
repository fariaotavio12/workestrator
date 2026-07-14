package com.apibot.shared.extensions

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.ArrayNode
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper

/**
 * Small structured sub-fields (lists, logs, tagged unions) stay as opaque jsonb instead of being
 * fully modeled relationally — they are not independently addressable resources. This mapper is the
 * single conversion point between that jsonb and typed Kotlin values in domain/entity mappers.
 */
val sharedJsonMapper = jacksonObjectMapper()

/**
 * `T::class.java` erases generic arguments (e.g. `List<ProviderModelOption>` becomes raw `List`),
 * so Jackson would deserialize elements as `LinkedHashMap` instead of the real type. `TypeReference`
 * captures the full reified generic signature instead.
 */
inline fun <reified T> JsonNode.toObject(): T =
    sharedJsonMapper.convertValue(this, object : TypeReference<T>() {})

fun Any.toJsonNode(): JsonNode = sharedJsonMapper.valueToTree(this)

fun emptyJsonArray(): JsonNode = sharedJsonMapper.createArrayNode() as ArrayNode
