---
name: i18n
description: Internationalization rules for this Spring Boot project. Use when adding, reviewing, or migrating API messages (errors, success messages, notifications, responses), exception messages, Bean Validation messages, ApiExceptionHandler behavior, MessageSource files, or lang-based response localization.
---

# Internationalization (I18n)

API messages (errors, success messages, notifications, and user-facing response fields) must be localized consistently. Messages are resolved centrally: errors at `ApiExceptionHandler`, and other messages at the service/controller boundary through `ApiMessageResolver`. The frontend may send `lang=pt` or `lang=en`; the backend resolves customer-facing text accordingly.

## Scope

Localize customer-facing text:

- Error messages: thrown exceptions and validation annotations.
- Success/confirmation messages: operation completed messages and response confirmations.
- Notifications: user feedback and alerts returned by the API.
- Response field labels: option names or enum display values returned for UI display.
- User guidance: descriptions/helper text when returned by the API.

Do not localize:

- Logs.
- IDs, URLs, technical metadata, UUIDs, paths, or API field names.
- Internal/provider messages. Use a safe wrapper key instead.

## MessageSource Configuration

Use `MessageSourceConfig` with these settings:

- `setBasenames("classpath:messages")`: resolves `messages_pt.properties` and `messages_en.properties`.
- `setDefaultEncoding("UTF-8")`.
- `setFallbackToSystemLocale(false)`: never fall back to the JVM locale.
- `setUseCodeAsDefaultMessage(false)`: missing keys throw `NoSuchMessageException`, which `ApiMessageResolver` catches and falls back to the raw string.

## Target Architecture

- Keep `ApiExceptionHandler` as the primary place for error localization.
- Allow services/controllers to resolve success/info messages via injected `ApiMessageResolver`.
- Resolve language from `HttpServletRequest.getParameter("lang")`.
- Accept only supported languages: `pt`, `en`.
- Use Portuguese as the default language unless a task explicitly changes that.
- Never pass servlet/request/locale objects into services solely to translate errors.
- Keep domain logic free of translation details.

## Message Keys

Prefer stable message keys over final UI text in exceptions, validation annotations, and success messages.

```kotlin
throw ResourceNotFoundException("user.not_found")
throw BusinessRuleViolationException("workout.session.not_started")

val message = apiMessageResolver.resolve("auth.login.success", request)
```

Message files live in `src/main/resources/`:

```text
messages_pt.properties
messages_en.properties
```

Use lower dot-style keys organized by domain:

```properties
user.not_found=Usuario nao encontrado
common.invalid_payload=Payload invalido
auth.email.required=Email e obrigatorio
```

## Exception Rules

- Services throw canonical exceptions from `shared/exceptions/`.
- Exception messages should be message keys when the error is user-facing.
- If an exception still contains literal text during migration, the handler may return it as a fallback.
- Do not add feature-specific exception types just for translation.
- Do not include record IDs, stack traces, SQL, provider messages, or secrets in translated messages.

## Success Message Rules

- Services or DTOs that communicate success should use message keys.
- When a success message must be returned, inject `ApiMessageResolver` and resolve the key before returning it.
- Not every operation needs a success message field. Returning a typed DTO or HTTP 204 is acceptable when no user-facing confirmation is needed.

Example:

```kotlin
@Service
class SomeFeatureService(
    private val apiMessageResolver: ApiMessageResolver,
) {
    fun doSomething(request: HttpServletRequest): FeatureResponse {
        val message = apiMessageResolver.resolve("feature.done", request)
        return FeatureResponse(message = message)
    }
}
```

## Validation Rules

Bean Validation messages should use `{message.key}`:

```kotlin
@field:NotBlank(message = "{auth.email.required}")
@field:Email(message = "{auth.email.invalid}")
val email: String
```

When building validation `details`, translate each `FieldError.defaultMessage` through `ApiMessageResolver` before returning it.

## Handler Rules

`ApiExceptionHandler` should:

- Choose locale from `lang` query param; accept only `pt` and `en`; default to `pt`.
- Delegate all message resolution to `ApiMessageResolver`.
- Translate default handler messages such as invalid payload, invalid params, forbidden, unauthorized, not found, and internal error.
- Keep the response shape unchanged unless the user explicitly requests a contract change.

Expected shape remains:

```json
{
  "timestamp": "2026-05-09T...",
  "status": 404,
  "error": "Not Found",
  "message": "Usuario nao encontrado",
  "path": "/users/me",
  "traceId": "...",
  "details": null
}
```

## Migration Order

1. Add or verify `MessageSourceConfig`.
2. Add message bundles for `pt` and `en`.
3. Update `ApiExceptionHandler` to resolve language and translate keys.
4. Migrate shared/default exception messages.
5. Migrate Bean Validation annotations.
6. Migrate feature messages in small slices.
7. Compile after each slice.

## Review Heuristics

Check these before finishing:

- Literal Portuguese/English user-facing exception message in a service: replace with a message key.
- DTO validation message without `{...}`: move to message bundles.
- Controller accepting `lang` only to translate an error: move error translation to handler.
- Handler returning raw external provider messages: replace with a safe local key.
- Services building success messages: inject `ApiMessageResolver` and resolve before returning.
- All new message keys exist in both `messages_pt.properties` and `messages_en.properties`.
- Keys follow domain.context.action naming convention.
