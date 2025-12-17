# Database Connection Module
# Supabase PostgreSQL 연동

library(RPostgreSQL)
library(jsonlite)

# 환경 변수 로드
if (file.exists(".env")) {
  readRenviron(".env")
}

#' Supabase PostgreSQL 연결 생성
#'
#' @return PostgreSQL 연결 객체
#' @export
get_db_connection <- function() {
  tryCatch({
    # PostgreSQL 드라이버 로드
    drv <- dbDriver("PostgreSQL")
    
    # 연결 생성
    con <- dbConnect(
      drv,
      host = Sys.getenv("SUPABASE_DB_HOST"),
      port = as.integer(Sys.getenv("SUPABASE_DB_PORT", "5432")),
      dbname = Sys.getenv("SUPABASE_DB_NAME", "postgres"),
      user = Sys.getenv("SUPABASE_DB_USER", "postgres"),
      password = Sys.getenv("SUPABASE_DB_PASSWORD")
    )
    
    message("✓ Database connection established")
    return(con)
    
  }, error = function(e) {
    stop(paste("Database connection failed:", e$message))
  })
}

#' 데이터베이스 연결 종료
#'
#' @param con 데이터베이스 연결 객체
#' @export
close_db_connection <- function(con) {
  if (!is.null(con) && dbIsValid(con)) {
    dbDisconnect(con)
    message("✓ Database connection closed")
  }
}

#' 모든 채점 데이터 조회 (MFRM 분석용)
#'
#' @param con 데이터베이스 연결 객체
#' @param teacher_ids 분석할 교사 ID 목록 (NULL이면 전체)
#' @param essay_ids 분석할 에세이 ID 목록 (NULL이면 전체)
#' @return data.frame with columns: teacher_id, essay_id, rubric_id, score
#' @export
fetch_scores_for_mfrm <- function(con, teacher_ids = NULL, essay_ids = NULL) {
  query <- "
    SELECT 
      s.teacher_id,
      s.essay_id,
      s.rubric_id,
      s.score,
      t.name as teacher_name,
      e.title as essay_title,
      r.name as rubric_name
    FROM scores s
    JOIN teachers t ON s.teacher_id = t.id
    JOIN essays e ON s.essay_id = e.id
    JOIN rubrics r ON s.rubric_id = r.id
    WHERE t.is_active = TRUE 
      AND e.is_active = TRUE 
      AND r.is_active = TRUE
  "
  
  # 필터 조건 추가
  params <- list()
  if (!is.null(teacher_ids) && length(teacher_ids) > 0) {
    query <- paste(query, "AND s.teacher_id = ANY($1)")
    params[[1]] <- teacher_ids
  }
  if (!is.null(essay_ids) && length(essay_ids) > 0) {
    idx <- length(params) + 1
    query <- paste(query, sprintf("AND s.essay_id = ANY($%d)", idx))
    params[[idx]] <- essay_ids
  }
  
  query <- paste(query, "ORDER BY s.created_at")
  
  tryCatch({
    if (length(params) > 0) {
      result <- dbGetQuery(con, query, params)
    } else {
      result <- dbGetQuery(con, query)
    }
    
    message(sprintf("✓ Fetched %d scores", nrow(result)))
    return(result)
    
  }, error = function(e) {
    stop(paste("Failed to fetch scores:", e$message))
  })
}

#' MFRM 분석 실행 기록 생성
#'
#' @param con 데이터베이스 연결 객체
#' @param name 분석 이름
#' @param description 설명
#' @param teacher_ids 분석 대상 교사 ID 목록
#' @param essay_ids 분석 대상 에세이 ID 목록
#' @return run_id (UUID)
#' @export
create_mfrm_run <- function(con, name, description = NULL, 
                            teacher_ids = NULL, essay_ids = NULL) {
  query <- "
    INSERT INTO mfrm_runs (name, description, teacher_ids, essay_ids, status, started_at)
    VALUES ($1, $2, $3, $4, 'running', NOW())
    RETURNING id
  "
  
  tryCatch({
    result <- dbGetQuery(
      con, 
      query, 
      list(
        name, 
        description, 
        if (is.null(teacher_ids)) "{}" else paste0("{", paste(teacher_ids, collapse=","), "}"),
        if (is.null(essay_ids)) "{}" else paste0("{", paste(essay_ids, collapse=","), "}")
      )
    )
    
    run_id <- result$id[1]
    message(sprintf("✓ Created MFRM run: %s", run_id))
    return(run_id)
    
  }, error = function(e) {
    stop(paste("Failed to create MFRM run:", e$message))
  })
}

#' MFRM 분석 상태 업데이트
#'
#' @param con 데이터베이스 연결 객체
#' @param run_id 분석 실행 ID
#' @param status 상태 (running, completed, failed)
#' @param convergence 수렴 여부 (TRUE/FALSE)
#' @param total_scores 분석된 점수 개수
#' @param error_message 에러 메시지 (실패 시)
#' @export
update_mfrm_run_status <- function(con, run_id, status, convergence = NULL, 
                                    total_scores = NULL, error_message = NULL) {
  query <- "
    UPDATE mfrm_runs 
    SET status = $1,
        convergence = $2,
        total_scores = $3,
        error_message = $4,
        completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN NOW() ELSE completed_at END
    WHERE id = $5
  "
  
  tryCatch({
    dbExecute(
      con, 
      query, 
      list(status, convergence, total_scores, error_message, run_id)
    )
    
    message(sprintf("✓ Updated run %s status to: %s", run_id, status))
    
  }, error = function(e) {
    stop(paste("Failed to update run status:", e$message))
  })
}

#' MFRM 분석 결과 저장 (교사별)
#'
#' @param con 데이터베이스 연결 객체
#' @param run_id 분석 실행 ID
#' @param results data.frame with columns: teacher_id, severity, severity_se, infit, outfit, mean_score, sd_score, total_ratings
#' @export
save_mfrm_results <- function(con, run_id, results) {
  if (nrow(results) == 0) {
    message("⚠ No results to save")
    return(invisible())
  }
  
  # 기존 결과 삭제 (재분석 시)
  dbExecute(con, "DELETE FROM mfrm_results WHERE run_id = $1", list(run_id))
  
  # Bulk insert
  query <- "
    INSERT INTO mfrm_results 
    (run_id, teacher_id, severity, severity_se, infit, outfit, mean_score, sd_score, total_ratings)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  "
  
  tryCatch({
    for (i in 1:nrow(results)) {
      dbExecute(
        con, 
        query, 
        list(
          run_id,
          results$teacher_id[i],
          results$severity[i],
          results$severity_se[i],
          results$infit[i],
          results$outfit[i],
          results$mean_score[i],
          results$sd_score[i],
          results$total_ratings[i]
        )
      )
    }
    
    message(sprintf("✓ Saved %d MFRM results", nrow(results)))
    
  }, error = function(e) {
    stop(paste("Failed to save MFRM results:", e$message))
  })
}

#' 에세이 난이도 결과 저장
#'
#' @param con 데이터베이스 연결 객체
#' @param run_id 분석 실행 ID
#' @param difficulties data.frame with columns: essay_id, difficulty, difficulty_se, mean_score, sd_score
#' @export
save_essay_difficulties <- function(con, run_id, difficulties) {
  if (nrow(difficulties) == 0) {
    message("⚠ No difficulties to save")
    return(invisible())
  }
  
  # 기존 결과 삭제
  dbExecute(con, "DELETE FROM essay_difficulties WHERE run_id = $1", list(run_id))
  
  query <- "
    INSERT INTO essay_difficulties 
    (run_id, essay_id, difficulty, difficulty_se, mean_score, sd_score)
    VALUES ($1, $2, $3, $4, $5, $6)
  "
  
  tryCatch({
    for (i in 1:nrow(difficulties)) {
      dbExecute(
        con, 
        query, 
        list(
          run_id,
          difficulties$essay_id[i],
          difficulties$difficulty[i],
          difficulties$difficulty_se[i],
          difficulties$mean_score[i],
          difficulties$sd_score[i]
        )
      )
    }
    
    message(sprintf("✓ Saved %d essay difficulties", nrow(difficulties)))
    
  }, error = function(e) {
    stop(paste("Failed to save essay difficulties:", e$message))
  })
}

#' 특정 분석 결과 조회
#'
#' @param con 데이터베이스 연결 객체
#' @param run_id 분석 실행 ID
#' @return list with run info, results, and difficulties
#' @export
fetch_mfrm_analysis <- function(con, run_id) {
  # 분석 실행 정보
  run_query <- "SELECT * FROM mfrm_runs WHERE id = $1"
  run_info <- dbGetQuery(con, run_query, list(run_id))
  
  if (nrow(run_info) == 0) {
    stop(paste("Run not found:", run_id))
  }
  
  # 교사별 결과
  results_query <- "
    SELECT 
      mr.*,
      t.name as teacher_name,
      t.email as teacher_email
    FROM mfrm_results mr
    JOIN teachers t ON mr.teacher_id = t.id
    WHERE mr.run_id = $1
    ORDER BY mr.severity DESC
  "
  results <- dbGetQuery(con, results_query, list(run_id))
  
  # 에세이 난이도
  difficulties_query <- "
    SELECT 
      ed.*,
      e.title as essay_title,
      e.grade_level
    FROM essay_difficulties ed
    JOIN essays e ON ed.essay_id = e.id
    WHERE ed.run_id = $1
    ORDER BY ed.difficulty DESC
  "
  difficulties <- dbGetQuery(con, difficulties_query, list(run_id))
  
  return(list(
    run = run_info,
    results = results,
    difficulties = difficulties
  ))
}

#' 특정 교사의 모든 분석 이력 조회
#'
#' @param con 데이터베이스 연결 객체
#' @param teacher_id 교사 ID
#' @return data.frame with all analysis results for the teacher
#' @export
fetch_teacher_history <- function(con, teacher_id) {
  query <- "
    SELECT 
      mr.*,
      r.name as run_name,
      r.completed_at
    FROM mfrm_results mr
    JOIN mfrm_runs r ON mr.run_id = r.id
    WHERE mr.teacher_id = $1
      AND r.status = 'completed'
    ORDER BY r.completed_at DESC
  "
  
  results <- dbGetQuery(con, query, list(teacher_id))
  return(results)
}

