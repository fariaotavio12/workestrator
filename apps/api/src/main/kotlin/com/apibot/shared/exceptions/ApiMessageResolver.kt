package com.apibot.shared.exceptions

import jakarta.servlet.http.HttpServletRequest
import org.springframework.context.MessageSource
import org.springframework.context.NoSuchMessageException
import org.springframework.stereotype.Component
import java.util.Locale

private const val LANG_PARAM = "lang"
private const val PT_LANGUAGE = "pt"
private const val EN_LANGUAGE = "en"

@Component
class ApiMessageResolver(
    private val messageSource: MessageSource,
) {
    fun resolve(message: String, request: HttpServletRequest): String =
        resolve(message, localeFrom(request))

    fun resolve(message: String, locale: Locale): String {
        val key = message.removeSurrounding("{", "}")
        return try {
            messageSource.getMessage(key, null, locale)
        } catch (_: NoSuchMessageException) {
            message
        }
    }

    fun localeFrom(request: HttpServletRequest): Locale {
        val language = request.getParameter(LANG_PARAM)
            ?.trim()
            ?.lowercase(Locale.US)
            .orEmpty()

        return if (language == EN_LANGUAGE || language.startsWith("$EN_LANGUAGE-")) {
            Locale.ENGLISH
        } else {
            Locale(PT_LANGUAGE)
        }
    }
}
