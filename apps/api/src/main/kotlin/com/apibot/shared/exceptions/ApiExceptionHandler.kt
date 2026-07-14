package com.apibot.shared.exceptions

import com.apibot.features.auth.domain.exception.InvalidCredentialsException
import com.apibot.features.user.domain.exception.UserAlreadyExistsException
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.ConstraintViolationException
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.security.access.AccessDeniedException
import org.springframework.web.HttpMediaTypeNotSupportedException
import org.springframework.web.HttpRequestMethodNotSupportedException
import org.springframework.web.multipart.MaxUploadSizeExceededException
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.server.ResponseStatusException
import org.springframework.web.servlet.NoHandlerFoundException
import org.springframework.web.servlet.resource.NoResourceFoundException
import java.time.Instant

@RestControllerAdvice
class ApiExceptionHandler(
    private val apiMessageResolver: ApiMessageResolver,
) {
    private val logger = LoggerFactory.getLogger(ApiExceptionHandler::class.java)

    @ExceptionHandler(InvalidCredentialsException::class)
    fun handleInvalidCredentials(
        exception: InvalidCredentialsException,
        request: HttpServletRequest,
    ): ResponseEntity<ApiErrorResponse> = buildResponse(
        status = HttpStatus.UNAUTHORIZED,
        message = exception.message ?: "auth.unauthorized",
        request = request,
    )

    @ExceptionHandler(UnauthorizedException::class)
    fun handleUnauthorized(
        exception: UnauthorizedException,
        request: HttpServletRequest,
    ): ResponseEntity<ApiErrorResponse> = buildResponse(
        status = HttpStatus.UNAUTHORIZED,
        message = exception.message ?: "auth.unauthorized",
        request = request,
    )

    @ExceptionHandler(value = [ForbiddenException::class, AccessDeniedException::class])
    fun handleForbidden(
        exception: Exception,
        request: HttpServletRequest,
    ): ResponseEntity<ApiErrorResponse> = buildResponse(
        status = HttpStatus.FORBIDDEN,
        message = exception.message ?: "auth.forbidden",
        request = request,
    )

    @ExceptionHandler(value = [ResourceNotFoundException::class, NoHandlerFoundException::class, NoResourceFoundException::class])
    fun handleNotFound(
        exception: Exception,
        request: HttpServletRequest,
    ): ResponseEntity<ApiErrorResponse> = buildResponse(
        status = HttpStatus.NOT_FOUND,
        message = exception.message ?: "common.not_found",
        request = request,
    )

    @ExceptionHandler(ConflictException::class)
    fun handleConflict(
        exception: ConflictException,
        request: HttpServletRequest,
    ): ResponseEntity<ApiErrorResponse> = buildResponse(
        status = HttpStatus.CONFLICT,
        message = exception.message ?: "common.conflict",
        request = request,
    )

    @ExceptionHandler(UserAlreadyExistsException::class)
    fun handleUserAlreadyExists(
        exception: UserAlreadyExistsException,
        request: HttpServletRequest,
    ): ResponseEntity<ApiErrorResponse> = buildResponse(
        status = HttpStatus.CONFLICT,
        message = exception.message ?: "user.already_exists",
        request = request,
    )

    @ExceptionHandler(BusinessRuleViolationException::class)
    fun handleBusinessRule(
        exception: BusinessRuleViolationException,
        request: HttpServletRequest,
    ): ResponseEntity<ApiErrorResponse> = buildResponse(
        status = HttpStatus.UNPROCESSABLE_ENTITY,
        message = exception.message ?: "common.business_rule_violation",
        request = request,
    )

    @ExceptionHandler(ServiceUnavailableException::class)
    fun handleServiceUnavailable(
        exception: ServiceUnavailableException,
        request: HttpServletRequest,
    ): ResponseEntity<ApiErrorResponse> = buildResponse(
        status = HttpStatus.SERVICE_UNAVAILABLE,
        message = exception.message ?: "common.service_unavailable",
        request = request,
    )

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(
        exception: MethodArgumentNotValidException,
        request: HttpServletRequest,
    ): ResponseEntity<ApiErrorResponse> {
        val locale = apiMessageResolver.localeFrom(request)
        val details = exception.bindingResult.fieldErrors.map {
            "${it.field}: ${apiMessageResolver.resolve(it.defaultMessage.orEmpty(), locale)}"
        }

        return buildResponse(
            status = HttpStatus.BAD_REQUEST,
            message = "common.invalid_payload",
            request = request,
            details = details,
        )
    }

    @ExceptionHandler(ConstraintViolationException::class)
    fun handleConstraintViolation(
        exception: ConstraintViolationException,
        request: HttpServletRequest,
    ): ResponseEntity<ApiErrorResponse> = buildResponse(
        status = HttpStatus.BAD_REQUEST,
        message = "common.invalid_params",
        request = request,
        details = exception.constraintViolations.map {
            "${it.propertyPath}: ${apiMessageResolver.resolve(it.message, request)}"
        },
    )

    @ExceptionHandler(value = [HttpMessageNotReadableException::class, MissingServletRequestParameterException::class])
    fun handleBadRequest(
        exception: Exception,
        request: HttpServletRequest,
    ): ResponseEntity<ApiErrorResponse> = buildResponse(
        status = HttpStatus.BAD_REQUEST,
        message = "common.invalid_request",
        request = request,
    )

    @ExceptionHandler(HttpRequestMethodNotSupportedException::class)
    fun handleMethodNotAllowed(
        exception: HttpRequestMethodNotSupportedException,
        request: HttpServletRequest,
    ): ResponseEntity<ApiErrorResponse> = buildResponse(
        status = HttpStatus.METHOD_NOT_ALLOWED,
        message = "common.method_not_allowed",
        request = request,
    )

    @ExceptionHandler(HttpMediaTypeNotSupportedException::class)
    fun handleUnsupportedMediaType(
        exception: HttpMediaTypeNotSupportedException,
        request: HttpServletRequest,
    ): ResponseEntity<ApiErrorResponse> = buildResponse(
        status = HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        message = "common.unsupported_media_type",
        request = request,
    )

    @ExceptionHandler(MaxUploadSizeExceededException::class)
    fun handleMaxUploadSizeExceeded(
        exception: MaxUploadSizeExceededException,
        request: HttpServletRequest,
    ): ResponseEntity<ApiErrorResponse> = buildResponse(
        status = HttpStatus.PAYLOAD_TOO_LARGE,
        message = "common.upload_too_large",
        request = request,
    )

    @ExceptionHandler(ResponseStatusException::class)
    fun handleResponseStatus(
        exception: ResponseStatusException,
        request: HttpServletRequest,
    ): ResponseEntity<ApiErrorResponse> {
        val status = HttpStatus.valueOf(exception.statusCode.value())
        return buildResponse(
            status = status,
            message = exception.reason ?: "common.invalid_request",
            request = request,
        )
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(
        exception: Exception,
        request: HttpServletRequest,
    ): ResponseEntity<ApiErrorResponse> {
        logger.error("Erro inesperado ao processar requisicao", exception)
        return buildResponse(
            status = HttpStatus.INTERNAL_SERVER_ERROR,
            message = "common.internal_error",
            request = request,
        )
    }

    private fun buildResponse(
        status: HttpStatus,
        message: String,
        request: HttpServletRequest,
        details: List<String>? = null,
    ): ResponseEntity<ApiErrorResponse> {
        val traceId = MDC.get("traceId") ?: request.getHeader("X-Trace-Id")
        val resolvedMessage = apiMessageResolver.resolve(message, request)

        if (status.is5xxServerError) {
            logger.error(
                "Falha {} {} status={} traceId={} message={}",
                request.method,
                request.requestURI,
                status.value(),
                traceId,
                resolvedMessage,
            )
        } else if (status.is4xxClientError) {
            logger.warn(
                "Requisicao invalida {} {} status={} traceId={} message={}",
                request.method,
                request.requestURI,
                status.value(),
                traceId,
                resolvedMessage,
            )
        }

        val body = ApiErrorResponse(
            timestamp = Instant.now(),
            status = status.value(),
            error = status.reasonPhrase,
            message = resolvedMessage,
            path = request.requestURI,
            traceId = traceId,
            details = details?.takeIf { it.isNotEmpty() },
        )

        return ResponseEntity.status(status).body(body)
    }
}