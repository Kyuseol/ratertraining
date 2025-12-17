# Plumber API for MFRM System
# R Backend REST API

library(plumber)
library(jsonlite)

# 소스 파일 로드
source("db.R")
source("model.R")
source("utils.R")
source("analyze_with_data.R")
source("simple_analysis.R")
source("calibration.R")

# 환경 변수 로드
if (file.exists(".env")) {
  readRenviron(".env")
}

#* @apiTitle MFRM Rater Training API
#* @apiDescription REST API for Many-Facets Rasch Model analysis
#* @apiVersion 1.0.0

# ============================================================================
# CORS 설정
# ============================================================================

#* @filter cors
function(req, res) {
  res <- add_cors_headers(res, req)
  
  # OPTIONS 요청 처리 (preflight)
  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 200
    return(list())
  }
  
  plumber::forward()
}

# ============================================================================
# 루트 경로
# ============================================================================

#* API 루트 - 기본 정보 및 엔드포인트 안내
#* @get /
function() {
  return(list(
    service = "MFRM Rater Training API",
    version = "1.0.0 (Blueprint v0.9)",
    status = "running",
    message = "API is running. Use /health for health check or /api/info for detailed information.",
    endpoints = list(
      root = "/",
      health = "/health",
      info = "/api/info",
      analyze = "POST /api/mfrm/analyze",
      results = "GET /api/mfrm/results/{run_id}",
      teacher_history = "GET /api/mfrm/teacher/{teacher_id}",
      runs = "GET /api/mfrm/runs",
      active_version = "GET /api/mfrm/active-version",
      quality = "GET /api/mfrm/quality/{run_id}",
      stats = "GET /api/stats/*"
    ),
    timestamp = format(Sys.time(), "%Y-%m-%dT%H:%M:%S%z")
  ))
}

# ============================================================================
# 헬스 체크
# ============================================================================

#* Health check
#* @get /health
function() {
  return(list(
    status = "ok",
    service = "MFRM API",
    version = "1.0.0",
    timestamp = format(Sys.time(), "%Y-%m-%dT%H:%M:%S%z"),
    r_version = R.version.string
  ))
}

# ============================================================================
# MFRM 분석
# ============================================================================

#* Run MFRM analysis
#* @post /api/mfrm/analyze
#* @param run_name:string Analysis name (required)
#* @param description:string Description (optional)
#* @param teacher_ids:array Teacher IDs to include (optional, null = all)
#* @param essay_ids:array Essay IDs to include (optional, null = all)
function(req, res, run_name, description = NULL, teacher_ids = NULL, essay_ids = NULL) {
  tryCatch({
    log_message("INFO", "Starting MFRM analysis", run_name)
    
    # 데이터베이스 연결
    con <- get_db_connection()
    on.exit(close_db_connection(con))
    
    # 1. 분석 실행 기록 생성
    run_id <- create_mfrm_run(con, run_name, description, teacher_ids, essay_ids)
    
    # 2. 채점 데이터 조회
    scores_data <- fetch_scores_for_mfrm(con, teacher_ids, essay_ids)
    
    if (nrow(scores_data) == 0) {
      update_mfrm_run_status(con, run_id, "failed", 
                             error_message = "No scores found")
      stop("No scores data available for analysis")
    }
    
    # 3. MFRM 분석 실행
    mfrm_results <- fit_mfrm(scores_data)
    
    # 4. 결과 저장
    teacher_params <- mfrm_results$teacher_parameters
    essay_params <- mfrm_results$essay_parameters
    
    # 피드백 생성
    teacher_params <- interpret_mfrm_results(teacher_params)
    
    save_mfrm_results(con, run_id, teacher_params)
    save_essay_difficulties(con, run_id, essay_params)
    
    # 5. 상태 업데이트
    update_mfrm_run_status(
      con, 
      run_id, 
      "completed", 
      convergence = mfrm_results$converged,
      total_scores = nrow(scores_data)
    )
    
    log_message("INFO", "MFRM analysis completed", run_id)
    
    # 응답
    res$status <- 200
    return(list(
      success = TRUE,
      run_id = run_id,
      status = "completed",
      converged = mfrm_results$converged,
      summary = list(
        total_scores = nrow(scores_data),
        num_teachers = length(unique(scores_data$teacher_id)),
        num_essays = length(unique(scores_data$essay_id)),
        deviance = mfrm_results$fit_statistics$deviance,
        aic = mfrm_results$fit_statistics$aic,
        bic = mfrm_results$fit_statistics$bic
      )
    ))
    
  }, error = function(e) {
    log_message("ERROR", "MFRM analysis failed", e$message)
    
    if (exists("con") && !is.null(con) && dbIsValid(con)) {
      if (exists("run_id")) {
        update_mfrm_run_status(con, run_id, "failed", 
                               error_message = e$message)
      }
      close_db_connection(con)
    }
    
    res$status <- 500
    return(json_error(e$message, 500))
  })
}

#* Get MFRM analysis results
#* @get /api/mfrm/results/<run_id>
#* @param run_id:string Run ID (UUID)
function(req, res, run_id) {
  tryCatch({
    if (!is_valid_uuid(run_id)) {
      stop("Invalid run ID format")
    }
    
    con <- get_db_connection()
    on.exit(close_db_connection(con))
    
    analysis <- fetch_mfrm_analysis(con, run_id)
    
    res$status <- 200
    return(list(
      success = TRUE,
      run = analysis$run,
      results = analysis$results,
      difficulties = analysis$difficulties
    ))
    
  }, error = function(e) {
    log_message("ERROR", "Failed to fetch results", e$message)
    res$status <- 500
    return(json_error(e$message, 500))
  })
}

#* Get teacher analysis history
#* @get /api/mfrm/teacher/<teacher_id>
#* @param teacher_id:string Teacher ID (UUID)
function(req, res, teacher_id) {
  tryCatch({
    if (!is_valid_uuid(teacher_id)) {
      stop("Invalid teacher ID format")
    }
    
    con <- get_db_connection()
    on.exit(close_db_connection(con))
    
    history <- fetch_teacher_history(con, teacher_id)
    
    res$status <- 200
    return(list(
      success = TRUE,
      teacher_id = teacher_id,
      history = history
    ))
    
  }, error = function(e) {
    log_message("ERROR", "Failed to fetch teacher history", e$message)
    res$status <- 500
    return(json_error(e$message, 500))
  })
}

#* List all MFRM runs
#* @get /api/mfrm/runs
#* @param status:string Filter by status (optional)
#* @param limit:int Maximum number of results (default: 50)
function(req, res, status = NULL, limit = 50) {
  tryCatch({
    con <- get_db_connection()
    on.exit(close_db_connection(con))
    
    query <- "SELECT * FROM mfrm_runs"
    params <- list()
    
    if (!is.null(status)) {
      query <- paste(query, "WHERE status = $1")
      params[[1]] <- status
    }
    
    query <- paste(query, "ORDER BY created_at DESC LIMIT $", 
                   length(params) + 1, sep = "")
    params[[length(params) + 1]] <- as.integer(limit)
    
    runs <- if (length(params) > 0) {
      dbGetQuery(con, query, params)
    } else {
      dbGetQuery(con, query)
    }
    
    res$status <- 200
    return(list(
      success = TRUE,
      runs = runs,
      count = nrow(runs)
    ))
    
  }, error = function(e) {
    log_message("ERROR", "Failed to fetch runs", e$message)
    res$status <- 500
    return(json_error(e$message, 500))
  })
}

# ============================================================================
# 통계 및 대시보드
# ============================================================================

#* Get teacher statistics
#* @get /api/stats/teachers
function(req, res) {
  tryCatch({
    con <- get_db_connection()
    on.exit(close_db_connection(con))
    
    stats <- dbGetQuery(con, "SELECT * FROM teacher_statistics")
    
    res$status <- 200
    return(list(
      success = TRUE,
      statistics = stats
    ))
    
  }, error = function(e) {
    log_message("ERROR", "Failed to fetch teacher statistics", e$message)
    res$status <- 500
    return(json_error(e$message, 500))
  })
}

#* Get essay statistics
#* @get /api/stats/essays
function(req, res) {
  tryCatch({
    con <- get_db_connection()
    on.exit(close_db_connection(con))
    
    stats <- dbGetQuery(con, "SELECT * FROM essay_statistics")
    
    res$status <- 200
    return(list(
      success = TRUE,
      statistics = stats
    ))
    
  }, error = function(e) {
    log_message("ERROR", "Failed to fetch essay statistics", e$message)
    res$status <- 500
    return(json_error(e$message, 500))
  })
}

#* Get latest MFRM results
#* @get /api/stats/latest
function(req, res) {
  tryCatch({
    con <- get_db_connection()
    on.exit(close_db_connection(con))
    
    latest <- dbGetQuery(con, "SELECT * FROM latest_mfrm_results")
    
    res$status <- 200
    return(list(
      success = TRUE,
      results = latest
    ))
    
  }, error = function(e) {
    log_message("ERROR", "Failed to fetch latest results", e$message)
    res$status <- 500
    return(json_error(e$message, 500))
  })
}

# ============================================================================
# 시스템 정보
# ============================================================================

# ============================================================================
# Blueprint v0.9: 품질 지표 및 배치 재추정
# ============================================================================

#* Get active version MFRM results
#* @get /api/mfrm/active-version
function(req, res) {
  tryCatch({
    con <- get_db_connection()
    on.exit(close_db_connection(con))
    
    # 현재 활성 버전 조회
    active_run <- dbGetQuery(con, "
      SELECT * FROM mfrm_runs 
      WHERE is_active_version = TRUE 
        AND status = 'completed'
      ORDER BY completed_at DESC 
      LIMIT 1
    ")
    
    if (nrow(active_run) == 0) {
      return(list(
        success = FALSE,
        message = "No active version found"
      ))
    }
    
    # 해당 버전의 결과 조회
    results <- dbGetQuery(con, 
      "SELECT * FROM mfrm_results WHERE run_id = $1",
      list(active_run$id[1])
    )
    
    res$status <- 200
    return(list(
      success = TRUE,
      run = active_run[1,],
      results = results
    ))
    
  }, error = function(e) {
    log_message("ERROR", "Failed to fetch active version", e$message)
    res$status <- 500
    return(json_error(e$message, 500))
  })
}

#* Rollback to previous version
#* @post /api/mfrm/rollback
#* @param target_version_id:string Target version ID to rollback
function(req, res, target_version_id) {
  tryCatch({
    con <- get_db_connection()
    on.exit(close_db_connection(con))
    
    # 모든 버전 비활성화
    dbExecute(con, "UPDATE mfrm_runs SET is_active_version = FALSE")
    
    # 대상 버전 활성화
    dbExecute(con, 
      "UPDATE mfrm_runs SET is_active_version = TRUE WHERE version_id = $1",
      list(target_version_id)
    )
    
    log_message("INFO", "Rolled back to version", target_version_id)
    
    res$status <- 200
    return(list(
      success = TRUE,
      message = paste("Rolled back to version", target_version_id),
      version_id = target_version_id
    ))
    
  }, error = function(e) {
    log_message("ERROR", "Rollback failed", e$message)
    res$status <- 500
    return(json_error(e$message, 500))
  })
}

#* Calculate quality metrics for a run (Blueprint v0.9)
#* @get /api/mfrm/quality/<run_id>
#* @param run_id:string Run ID (UUID)
function(req, res, run_id) {
  tryCatch({
    con <- get_db_connection()
    on.exit(close_db_connection(con))
    
    # 교사 파라미터 조회
    teacher_params <- dbGetQuery(con,
      "SELECT * FROM mfrm_results WHERE run_id = $1",
      list(run_id)
    )
    
    if (nrow(teacher_params) == 0) {
      stop("No results found for this run")
    }
    
    # 품질 지표 계산
    quality_metrics <- calculate_quality_metrics(teacher_params)
    
    res$status <- 200
    return(list(
      success = TRUE,
      run_id = run_id,
      quality_metrics = quality_metrics
    ))
    
  }, error = function(e) {
    log_message("ERROR", "Failed to calculate quality metrics", e$message)
    res$status <- 500
    return(json_error(e$message, 500))
  })
}

#* Get API information
#* @get /api/info
function() {
  return(list(
    service = "MFRM Rater Training API",
    version = "1.0.0 (Blueprint v0.9)",
    description = "Many-Facets Rasch Model analysis for rater training",
    blueprint_features = list(
      evaluation_elements = 9,
      scale = "3-point (1/2/3)",
      anchor_essays = "12-16 recommended",
      calibration_set = "24-32 recommended",
      diagnosis_stages = c("preliminary(6)", "official(9)", "advanced(18)"),
      batch_reestimation = "weekly"
    ),
    endpoints = list(
      health = "/health",
      analyze = "POST /api/mfrm/analyze",
      results = "GET /api/mfrm/results/{run_id}",
      teacher_history = "GET /api/mfrm/teacher/{teacher_id}",
      runs = "GET /api/mfrm/runs",
      active_version = "GET /api/mfrm/active-version",
      rollback = "POST /api/mfrm/rollback",
      quality = "GET /api/mfrm/quality/{run_id}",
      stats = "GET /api/stats/*"
    ),
    database = "Supabase PostgreSQL",
    model = "TAM (Test Analysis Modules)",
    timestamp = format(Sys.time(), "%Y-%m-%dT%H:%M:%S%z")
  ))
}

# ============================================================================
# MFRM 분석 (데이터베이스 연결 우회)
# ============================================================================

#* Run MFRM analysis with provided data (no database required)
#* @post /api/mfrm/analyze-with-data
#* @param req Request object
#* @param res Response object
function(req, res) {
  tryCatch({
    log_message("INFO", "Starting MFRM analysis with provided data")
    
    # 요청 본문에서 데이터 추출
    body <- req$body
    
    if (is.null(body) || is.null(body$scores_data)) {
      stop("Missing scores_data in request body")
    }
    
    scores_df <- as.data.frame(body$scores_data)
    
    # 필수 컬럼 확인
    required_cols <- c("teacher_id", "essay_id", "rubric_id", "score")
    missing_cols <- setdiff(required_cols, names(scores_df))
    
    if (length(missing_cols) > 0) {
      stop(paste("Missing required columns:", paste(missing_cols, collapse = ", ")))
    }
    
    cat(sprintf("Received %d scores from frontend\n", nrow(scores_df)))
    
    # teacher_id를 expert_id로 변환하여 전문가 기반 캘리브레이션 사용
    # calibration.R의 run_expert_calibration은 전문가 기반 MFRM 분석에 최적화됨
    expert_scores_df <- data.frame(
      expert_id = scores_df$teacher_id,
      essay_id = scores_df$essay_id,
      rubric_id = scores_df$rubric_id,
      score = scores_df$score,
      stringsAsFactors = FALSE
    )
    
    # 전문가 기반 캘리브레이션 실행 (TAM 기반, 실패 시 simple로 대체)
    mfrm_results <- run_expert_calibration(expert_scores_df)
    
    if (!mfrm_results$success) {
      stop(mfrm_results$error)
    }
    
    # 결과 형식 변환 (기존 API 호환성 유지)
    teacher_params <- mfrm_results$expert_parameters
    if (!is.null(teacher_params)) {
      # expert_id를 teacher_id로 변환
      names(teacher_params)[names(teacher_params) == "expert_id"] <- "teacher_id"
      # 피드백 추가
      teacher_params$feedback <- sapply(1:nrow(teacher_params), function(i) {
        parts <- c()
        if (abs(teacher_params$severity[i]) > 0.5) {
          if (teacher_params$severity[i] > 0) parts <- c(parts, "엄격한 채점 경향")
          else parts <- c(parts, "관대한 채점 경향")
        }
        if (length(parts) == 0) "채점 품질 양호" else paste(parts, collapse = ", ")
      })
    }
    
    log_message("INFO", sprintf("MFRM analysis completed successfully (method: %s)", 
                              mfrm_results$method))
    
    # 응답 (기존 API 호환성 유지)
    res$status <- 200
    return(list(
      success = TRUE,
      converged = mfrm_results$converged,
      method = mfrm_results$method,
      teacher_parameters = teacher_params,
      essay_parameters = mfrm_results$essay_parameters,
      fit_statistics = mfrm_results$fit_statistics,
      separation_reliability = mfrm_results$separation_reliability,
      summary = list(
        num_teachers = nrow(teacher_params),
        num_essays = mfrm_results$summary$total_essays,
        num_rubrics = length(unique(scores_df$rubric_id)),
        total_scores = nrow(scores_df),
        mean_difficulty = mfrm_results$summary$mean_difficulty,
        sd_difficulty = mfrm_results$summary$sd_difficulty
      )
    ))
    
  }, error = function(e) {
    log_message("ERROR", "MFRM analysis with data failed", e$message)
    res$status <- 500
    return(json_error(e$message, 500))
  })
}

# ============================================================================
# 캘리브레이션 (고정척도 구축) - Blueprint v0.9
# ============================================================================

#* Run initial calibration with consensus scores
#* @post /api/calibration/run
#* @param req Request object
#* @param res Response object
function(req, res) {
  tryCatch({
    log_message("INFO", "Starting initial calibration")
    
    # 요청 본문에서 데이터 추출
    body <- req$body
    
    if (is.null(body) || is.null(body$consensus_data)) {
      stop("Missing consensus_data in request body")
    }
    
    consensus_df <- as.data.frame(body$consensus_data)
    
    # 필수 컬럼 확인
    required_cols <- c("essay_id", "rubric_id", "consensus_score")
    missing_cols <- setdiff(required_cols, names(consensus_df))
    
    if (length(missing_cols) > 0) {
      stop(paste("Missing required columns:", paste(missing_cols, collapse = ", ")))
    }
    
    cat(sprintf("Received %d consensus scores for calibration\n", nrow(consensus_df)))
    
    # 캘리브레이션 실행 (간단한 버전 사용)
    calibration_results <- run_simple_calibration(consensus_df)
    
    if (!calibration_results$success) {
      stop(calibration_results$error)
    }
    
    log_message("INFO", "Calibration completed successfully")
    
    # 응답
    res$status <- 200
    return(list(
      success = TRUE,
      converged = calibration_results$converged,
      method = calibration_results$method,
      essay_parameters = calibration_results$essay_parameters,
      thresholds = calibration_results$thresholds,
      fit_statistics = calibration_results$fit_statistics,
      separation_reliability = calibration_results$separation_reliability,
      summary = calibration_results$summary
    ))
    
  }, error = function(e) {
    log_message("ERROR", "Calibration failed", e$message)
    res$status <- 500
    return(json_error(e$message, 500))
  })
}

#* Run full calibration with TAM (if available)
#* @post /api/calibration/run-full
#* @param req Request object
#* @param res Response object
function(req, res) {
  tryCatch({
    log_message("INFO", "Starting full calibration with TAM")
    
    # 요청 본문에서 데이터 추출
    body <- req$body
    
    if (is.null(body) || is.null(body$consensus_data)) {
      stop("Missing consensus_data in request body")
    }
    
    consensus_df <- as.data.frame(body$consensus_data)
    
    # 필수 컬럼 확인
    required_cols <- c("essay_id", "rubric_id", "consensus_score")
    missing_cols <- setdiff(required_cols, names(consensus_df))
    
    if (length(missing_cols) > 0) {
      stop(paste("Missing required columns:", paste(missing_cols, collapse = ", ")))
    }
    
    cat(sprintf("Received %d consensus scores for full calibration\n", nrow(consensus_df)))
    
    # 전체 캘리브레이션 실행 (TAM 사용)
    calibration_results <- run_calibration(consensus_df)
    
    if (!calibration_results$success) {
      stop(calibration_results$error)
    }
    
    log_message("INFO", "Full calibration completed successfully")
    
    # 응답
    res$status <- 200
    return(list(
      success = TRUE,
      converged = calibration_results$converged,
      essay_parameters = calibration_results$essay_parameters,
      thresholds = calibration_results$thresholds,
      fit_statistics = calibration_results$fit_statistics,
      separation_reliability = calibration_results$separation_reliability,
      summary = calibration_results$summary
    ))
    
  }, error = function(e) {
    log_message("ERROR", "Full calibration failed", e$message)
    res$status <- 500
    return(json_error(e$message, 500))
  })
}

#* Run expert-based MFRM calibration (진정한 MFRM)
#* @post /api/calibration/run-expert
#* @param req Request object
#* @param res Response object
function(req, res) {
  tryCatch({
    log_message("INFO", "Starting expert-based MFRM calibration")
    
    # 요청 본문에서 데이터 추출
    body <- req$body
    
    if (is.null(body) || is.null(body$expert_scores)) {
      stop("Missing expert_scores in request body")
    }
    
    scores_df <- as.data.frame(body$expert_scores)
    
    # 필수 컬럼 확인
    required_cols <- c("expert_id", "essay_id", "rubric_id", "score")
    missing_cols <- setdiff(required_cols, names(scores_df))
    
    if (length(missing_cols) > 0) {
      stop(paste("Missing required columns:", paste(missing_cols, collapse = ", ")))
    }
    
    n_experts <- length(unique(scores_df$expert_id))
    n_essays <- length(unique(scores_df$essay_id))
    cat(sprintf("Received %d expert scores (%d experts × %d essays)\n", 
                nrow(scores_df), n_experts, n_essays))
    
    # 전문가 기반 캘리브레이션 실행
    calibration_results <- run_expert_calibration(scores_df)
    
    if (!calibration_results$success) {
      stop(calibration_results$error)
    }
    
    log_message("INFO", "Expert calibration completed successfully")
    
    # 응답
    res$status <- 200
    return(list(
      success = TRUE,
      converged = calibration_results$converged,
      method = calibration_results$method,
      essay_parameters = calibration_results$essay_parameters,
      expert_parameters = calibration_results$expert_parameters,
      fit_statistics = calibration_results$fit_statistics,
      separation_reliability = calibration_results$separation_reliability,
      summary = calibration_results$summary
    ))
    
  }, error = function(e) {
    log_message("ERROR", "Expert calibration failed", e$message)
    res$status <- 500
    return(json_error(e$message, 500))
  })
}
