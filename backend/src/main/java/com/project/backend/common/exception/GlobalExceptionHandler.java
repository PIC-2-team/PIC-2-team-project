package com.project.backend.common.exception;

import com.project.backend.common.response.ApiErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiErrorResponse> handleApiException(ApiException exception) {
        return ResponseEntity.status(exception.getStatus())
                .body(ApiErrorResponse.of(exception.getCode(), exception.getMessage()));
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception exception, Object body, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        String code = switch (status.value()) {
            case 401 -> "UNAUTHORIZED";
            case 403 -> "FORBIDDEN";
            case 404 -> "NOT_FOUND";
            default -> status.is5xxServerError() ? "INTERNAL_ERROR" : "VALIDATION_ERROR";
        };
        String message = switch (code) {
            case "UNAUTHORIZED" -> "로그인이 필요합니다.";
            case "FORBIDDEN" -> "접근 권한이 없습니다.";
            case "NOT_FOUND" -> "요청한 리소스를 찾을 수 없습니다.";
            case "INTERNAL_ERROR" -> "서버 내부 오류가 발생했습니다.";
            default -> "요청 형식이 올바르지 않습니다.";
        };

        if (exception instanceof MethodArgumentNotValidException validation) {
            status = HttpStatusCode.valueOf(422);
            message = validation.getBindingResult().getAllErrors().stream()
                    .map(error -> error.getDefaultMessage())
                    .filter(value -> value != null)
                    .findFirst().orElse("입력값이 올바르지 않습니다.");
        }
        if (status.is5xxServerError()) {
            log.error("요청 처리 중 서버 오류", exception);
        }
        return super.handleExceptionInternal(
                exception, ApiErrorResponse.of(code, message), headers, status, request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpectedException(Exception exception) {
        log.error("처리되지 않은 서버 오류", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiErrorResponse.of("INTERNAL_ERROR", "서버 내부 오류가 발생했습니다."));
    }
}
