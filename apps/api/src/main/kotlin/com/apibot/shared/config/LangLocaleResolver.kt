package com.apibot.shared.config

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.stereotype.Component
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver
import java.util.Locale

private const val LANG_PARAM = "lang"
private const val EN_LANGUAGE = "en"

@Component("localeResolver")
class LangLocaleResolver : AcceptHeaderLocaleResolver() {
    override fun resolveLocale(request: HttpServletRequest): Locale {
        val language = request.getParameter(LANG_PARAM)
            ?.trim()
            ?.lowercase(Locale.US)
            .orEmpty()

        return if (language == EN_LANGUAGE || language.startsWith("$EN_LANGUAGE-")) {
            Locale.ENGLISH
        } else {
            Locale("pt")
        }
    }

    override fun setLocale(
        request: HttpServletRequest,
        response: HttpServletResponse?,
        locale: Locale?,
    ) = Unit
}
