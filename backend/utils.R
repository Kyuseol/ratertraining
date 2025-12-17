# Utility Functions
# 공통 유틸리티 함수들

library(jsonlite)

#' JSON 응답 생성 (성공)
#'
#' @param data 응답 데이터
#' @param message 메시지
#' @return JSON 문자열
#' @export
json_success <- function(data = NULL, message = "Success") {
  response <- list(
    success = TRUE,
    message = message,
    data = data,
    timestamp = format(Sys.time(), "%Y-%m-%dT%H:%M:%S%z")
  )
  
  return(toJSON(response, auto_unbox = TRUE, pretty = TRUE))
}

#' JSON 응답 생성 (에러)
#'
#' @param error_message 에러 메시지
#' @param status_code HTTP 상태 코드
#' @return JSON 문자열
#' @export
json_error <- function(error_message, status_code = 500) {
  response <- list(
    success = FALSE,
    error = error_message,
    status_code = status_code,
    timestamp = format(Sys.time(), "%Y-%m-%dT%H:%M:%S%z")
  )
  
  return(toJSON(response, auto_unbox = TRUE, pretty = TRUE))
}

#' 요청 데이터 검증
#'
#' @param data 요청 데이터
#' @param required_fields 필수 필드 목록
#' @return TRUE if valid, stops with error otherwise
#' @export
validate_request <- function(data, required_fields) {
  if (is.null(data)) {
    stop("Request body is empty")
  }
  
  if (!is.list(data)) {
    stop("Invalid request format")
  }
  
  missing_fields <- setdiff(required_fields, names(data))
  if (length(missing_fields) > 0) {
    stop(paste("Missing required fields:", paste(missing_fields, collapse = ", ")))
  }
  
  return(TRUE)
}

#' UUID 유효성 검증
#'
#' @param uuid_string UUID 문자열
#' @return TRUE if valid UUID
#' @export
is_valid_uuid <- function(uuid_string) {
  pattern <- "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
  return(grepl(pattern, uuid_string, ignore.case = TRUE))
}

#' 로그 메시지 출력
#'
#' @param level 로그 레벨 (INFO, WARNING, ERROR)
#' @param message 메시지
#' @param ... 추가 정보
#' @export
log_message <- function(level = "INFO", message, ...) {
  timestamp <- format(Sys.time(), "%Y-%m-%d %H:%M:%S")
  full_message <- sprintf("[%s] %s: %s", timestamp, level, message)
  
  if (length(list(...)) > 0) {
    full_message <- paste(full_message, paste(list(...), collapse = " "))
  }
  
  # 파일 로깅
  log_file <- Sys.getenv("LOG_FILE", "logs/mfrm-api.log")
  if (dir.exists(dirname(log_file))) {
    write(full_message, file = log_file, append = TRUE)
  }
  
  # 콘솔 출력
  cat(full_message, "\n")
}

#' 에러 핸들러
#'
#' @param func 실행할 함수
#' @param req HTTP 요청 객체
#' @param res HTTP 응답 객체
#' @export
safe_handler <- function(func, req, res) {
  tryCatch({
    result <- func(req, res)
    return(result)
    
  }, error = function(e) {
    error_msg <- e$message
    log_message("ERROR", error_msg)
    
    res$status <- 500
    res$body <- json_error(error_msg, 500)
    return(res)
  })
}

#' CORS 헤더 추가
#'
#' @param res HTTP 응답 객체
#' @param req HTTP 요청 객체
#' @return 응답 객체 (헤더 추가됨)
#' @export
add_cors_headers <- function(res, req) {
  allowed_origins <- strsplit(
    Sys.getenv("CORS_ORIGINS", "http://localhost:3000"),
    ","
  )[[1]]
  
  origin <- req$HTTP_ORIGIN
  if (!is.null(origin) && origin %in% allowed_origins) {
    res$setHeader("Access-Control-Allow-Origin", origin)
  } else {
    res$setHeader("Access-Control-Allow-Origin", allowed_origins[1])
  }
  
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  res$setHeader("Access-Control-Max-Age", "86400")
  
  return(res)
}

#' 데이터프레임을 JSON으로 안전하게 변환
#'
#' @param df 데이터프레임
#' @return JSON 문자열
#' @export
df_to_json <- function(df) {
  if (nrow(df) == 0) {
    return("[]")
  }
  
  # NA 값 처리
  df[is.na(df)] <- NULL
  
  return(toJSON(df, auto_unbox = FALSE, pretty = TRUE, na = "null"))
}

#' 분석 진행 상황 계산
#'
#' @param current 현재 진행 수
#' @param total 전체 수
#' @return 퍼센트 (0-100)
#' @export
calculate_progress <- function(current, total) {
  if (total == 0) return(0)
  return(round((current / total) * 100, 1))
}

#' 통계 요약 생성
#'
#' @param scores 점수 벡터
#' @return list with statistics
#' @export
calculate_summary_stats <- function(scores) {
  return(list(
    n = length(scores),
    mean = mean(scores, na.rm = TRUE),
    median = median(scores, na.rm = TRUE),
    sd = sd(scores, na.rm = TRUE),
    min = min(scores, na.rm = TRUE),
    max = max(scores, na.rm = TRUE),
    q25 = quantile(scores, 0.25, na.rm = TRUE),
    q75 = quantile(scores, 0.75, na.rm = TRUE)
  ))
} 
