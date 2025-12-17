# Calibration Module
# 초기 캘리브레이션 (고정척도 구축) 전용 MFRM 분석
# Blueprint v0.9: 전문가 개별 채점 기반 (진정한 MFRM)
#
# 핵심 개념:
# - 전문가 5명 × 에세이 24편 × 평가요소 8개 = 960개 관측치
# - 이 데이터로 MFRM 분석 → 에세이 난이도 추정
# - 전문가 엄격성도 함께 추정 (참고용)

library(TAM)
library(dplyr)
library(tidyr)

#' 캘리브레이션 분석 실행
#' 
#' 전문가 패널의 합의 점수를 사용하여 앵커/캘리브레이션 에세이의
#' 난이도(difficulty)를 추정하고 고정척도를 구축합니다.
#' 
#' @param consensus_data data.frame with columns: essay_id, rubric_id, consensus_score
#' @return list with calibration results
#' @export
run_calibration <- function(consensus_data) {
  tryCatch({
    message("=== 초기 캘리브레이션 시작 ===")
    
    # 데이터 검증
    validate_consensus_data(consensus_data)
    
    message(sprintf("입력 데이터: %d개 합의 점수", nrow(consensus_data)))
    
    # 데이터 준비: wide format으로 변환
    # 캘리브레이션에서는 "가상의 단일 평가자"가 모든 점수를 준 것으로 처리
    prepared_data <- prepare_calibration_data(consensus_data)
    
    message(sprintf("에세이: %d편, 평가요소: %d개", 
                    length(unique(consensus_data$essay_id)),
                    length(unique(consensus_data$rubric_id))))
    
    # TAM 모델 피팅 (Rating Scale Model)
    message("TAM 모델 피팅 중...")
    
    model <- TAM::tam.mml(
      resp = prepared_data$response_matrix,
      irtmodel = "RSM",  # Rating Scale Model
      control = list(
        maxiter = 1000,
        convD = 0.0001,
        snodes = 2000,
        progress = TRUE
      )
    )
    
    # 수렴 확인
    converged <- !is.null(model$converged) && model$converged
    if (!converged) {
      warning("⚠ 모델이 수렴하지 않았습니다. 결과에 주의하세요.")
    } else {
      message("✓ 모델 수렴 완료")
    }
    
    # 에세이 난이도 파라미터 추출
    essay_params <- extract_essay_difficulties(model, prepared_data)
    
    # 범주 문턱값 (thresholds) 추출
    thresholds <- extract_thresholds(model)
    
    # 적합도 통계
    fit_stats <- list(
      deviance = model$deviance,
      aic = model$ic$AIC,
      bic = model$ic$BIC,
      npar = model$ic$Npars
    )
    
    # 분리 신뢰도 계산
    separation_reliability <- calculate_separation_reliability(essay_params)
    
    message("=== 캘리브레이션 완료 ===")
    message(sprintf("분리 신뢰도: %.3f", separation_reliability))
    
    return(list(
      success = TRUE,
      converged = converged,
      essay_parameters = essay_params,
      thresholds = thresholds,
      fit_statistics = fit_stats,
      separation_reliability = separation_reliability,
      summary = list(
        total_essays = nrow(essay_params),
        total_observations = nrow(consensus_data),
        mean_difficulty = mean(essay_params$difficulty_logit, na.rm = TRUE),
        sd_difficulty = sd(essay_params$difficulty_logit, na.rm = TRUE)
      )
    ))
    
  }, error = function(e) {
    message(sprintf("❌ 캘리브레이션 실패: %s", e$message))
    return(list(
      success = FALSE,
      converged = FALSE,
      error = e$message
    ))
  })
}

#' 합의 점수 데이터 검증
#'
#' @param data 합의 점수 데이터
validate_consensus_data <- function(data) {
  # 필수 컬럼 확인
  required_cols <- c("essay_id", "rubric_id", "consensus_score")
  missing_cols <- setdiff(required_cols, names(data))
  
  if (length(missing_cols) > 0) {
    stop(paste("필수 컬럼 누락:", paste(missing_cols, collapse = ", ")))
  }
  
  # 최소 데이터 요구사항
  n_essays <- length(unique(data$essay_id))
  n_rubrics <- length(unique(data$rubric_id))
  n_scores <- nrow(data)
  
  MIN_ESSAYS <- 10
  MIN_RUBRICS <- 3
  
  if (n_essays < MIN_ESSAYS) {
    stop(sprintf("에세이 부족: %d편 (최소 %d편 필요)", n_essays, MIN_ESSAYS))
  }
  
  if (n_rubrics < MIN_RUBRICS) {
    stop(sprintf("평가요소 부족: %d개 (최소 %d개 필요)", n_rubrics, MIN_RUBRICS))
  }
  
  # 점수 범위 확인
  if (any(data$consensus_score < 1 | data$consensus_score > 3)) {
    stop("점수는 1, 2, 3 중 하나여야 합니다.")
  }
  
  message(sprintf("✓ 데이터 검증 통과: %d편 에세이, %d개 평가요소, %d개 점수",
                  n_essays, n_rubrics, n_scores))
}

#' 캘리브레이션용 데이터 준비
#'
#' @param data 합의 점수 데이터
#' @return list with response_matrix and mapping
prepare_calibration_data <- function(data) {
  # 에세이 × 평가요소 조합을 item으로 처리
  data$item_id <- paste(data$essay_id, data$rubric_id, sep = "_")
  
  essays <- unique(data$essay_id)
  rubrics <- unique(data$rubric_id)
  items <- unique(data$item_id)
  
  # Response matrix: 1행 (가상의 단일 평가자) × n_items
  # 캘리브레이션에서는 합의 점수 = 실제 관측값으로 처리
  response_matrix <- matrix(NA, nrow = 1, ncol = length(items))
  colnames(response_matrix) <- items
  
  for (i in 1:nrow(data)) {
    item_idx <- which(items == data$item_id[i])
    # 점수를 0-indexed로 변환 (TAM은 0부터 시작)
    response_matrix[1, item_idx] <- data$consensus_score[i] - 1
  }
  
  return(list(
    response_matrix = response_matrix,
    mapping = list(
      essays = essays,
      rubrics = rubrics,
      items = items
    )
  ))
}

#' 에세이 난이도 파라미터 추출
#'
#' @param model TAM 모델 객체
#' @param prepared_data 준비된 데이터
#' @return data.frame with essay difficulties
extract_essay_difficulties <- function(model, prepared_data) {
  # Item parameters (xsi)
  item_params <- model$xsi
  items <- prepared_data$mapping$items
  essays <- prepared_data$mapping$essays
  
  # 에세이별 평균 난이도 계산
  results <- data.frame(
    essay_id = essays,
    difficulty_logit = numeric(length(essays)),
    difficulty_se = numeric(length(essays)),
    infit = numeric(length(essays)),
    outfit = numeric(length(essays)),
    mean_score = numeric(length(essays)),
    stringsAsFactors = FALSE
  )
  
  # Item fit statistics
  item_fit <- TAM::tam.fit(model)
  
  for (i in 1:length(essays)) {
    essay_id <- essays[i]
    essay_items <- grep(paste0("^", essay_id, "_"), items, value = TRUE)
    essay_item_indices <- which(items %in% essay_items)
    
    if (length(essay_item_indices) > 0) {
      # 해당 에세이의 item parameters 평균
      essay_xsi <- item_params[essay_item_indices, "xsi"]
      results$difficulty_logit[i] <- mean(essay_xsi, na.rm = TRUE)
      results$difficulty_se[i] <- sd(essay_xsi, na.rm = TRUE) / sqrt(length(essay_xsi))
      
      # 해당 에세이의 fit statistics 평균
      if (!is.null(item_fit)) {
        results$infit[i] <- mean(item_fit$itemfit$Infit[essay_item_indices], na.rm = TRUE)
        results$outfit[i] <- mean(item_fit$itemfit$Outfit[essay_item_indices], na.rm = TRUE)
      }
      
      # 평균 점수
      response_scores <- prepared_data$response_matrix[1, essay_item_indices] + 1  # 0-indexed to 1-indexed
      results$mean_score[i] <- mean(response_scores, na.rm = TRUE)
    }
  }
  
  # 95% CI 계산
  results$difficulty_ci_lower <- results$difficulty_logit - 1.96 * results$difficulty_se
  results$difficulty_ci_upper <- results$difficulty_logit + 1.96 * results$difficulty_se
  
  message(sprintf("✓ %d개 에세이 난이도 추출 완료", nrow(results)))
  
  return(results)
}

#' 범주 문턱값 추출
#'
#' @param model TAM 모델 객체
#' @return data.frame with thresholds
extract_thresholds <- function(model) {
  # Rating scale thresholds
  xsi <- model$xsi
  
  # 문턱값 추출 (Cat1, Cat2 등)
  threshold_rows <- grep("^Cat", rownames(xsi))
  
  if (length(threshold_rows) > 0) {
    thresholds <- data.frame(
      category = rownames(xsi)[threshold_rows],
      threshold = xsi[threshold_rows, "xsi"],
      se = xsi[threshold_rows, "se.xsi"],
      stringsAsFactors = FALSE
    )
    
    message(sprintf("✓ %d개 문턱값 추출", nrow(thresholds)))
    return(thresholds)
  }
  
  return(NULL)
}

#' 분리 신뢰도 계산
#'
#' @param essay_params 에세이 파라미터 데이터프레임
#' @return 분리 신뢰도 (0-1)
calculate_separation_reliability <- function(essay_params) {
  # 분리 신뢰도 = (관측분산 - 오차분산) / 관측분산
  observed_var <- var(essay_params$difficulty_logit, na.rm = TRUE)
  error_var <- mean(essay_params$difficulty_se^2, na.rm = TRUE)
  
  if (observed_var <= error_var || observed_var == 0) {
    return(0)
  }
  
  reliability <- (observed_var - error_var) / observed_var
  return(max(0, min(1, reliability)))  # 0-1 범위로 제한
}

#' 간단한 캘리브레이션 (TAM 없이 기술통계만)
#' 
#' TAM 패키지 문제 시 대체용
#' @param consensus_data 합의 점수 데이터
#' @return list with basic calibration results
run_simple_calibration <- function(consensus_data) {
  message("=== 간단한 캘리브레이션 (기술통계) ===")
  
  # 에세이별 통계
  essay_stats <- consensus_data %>%
    group_by(essay_id) %>%
    summarise(
      mean_score = mean(consensus_score, na.rm = TRUE),
      sd_score = sd(consensus_score, na.rm = TRUE),
      n_rubrics = n(),
      .groups = "drop"
    ) %>%
    mutate(
      # 평균 점수를 logit 스케일로 변환 (간단한 근사)
      # logit = ln(p / (1-p)), p = (mean - min) / (max - min)
      p = (mean_score - 1) / 2,  # 1-3 척도를 0-1로
      p = pmax(0.01, pmin(0.99, p)),  # 극단값 방지
      difficulty_logit = -log(p / (1 - p)),  # 난이도: 높은 점수 = 낮은 난이도
      difficulty_se = sd_score / sqrt(n_rubrics)
    )
  
  results <- data.frame(
    essay_id = essay_stats$essay_id,
    difficulty_logit = essay_stats$difficulty_logit,
    difficulty_se = essay_stats$difficulty_se,
    mean_score = essay_stats$mean_score,
    sd_score = essay_stats$sd_score,
    infit = 1.0,  # 기본값
    outfit = 1.0,  # 기본값
    stringsAsFactors = FALSE
  )
  
  results$difficulty_ci_lower <- results$difficulty_logit - 1.96 * results$difficulty_se
  results$difficulty_ci_upper <- results$difficulty_logit + 1.96 * results$difficulty_se
  
  separation_reliability <- calculate_separation_reliability(results)
  
  return(list(
    success = TRUE,
    converged = TRUE,
    method = "simple",
    essay_parameters = results,
    thresholds = NULL,
    fit_statistics = list(
      deviance = NA,
      aic = NA,
      bic = NA
    ),
    separation_reliability = separation_reliability,
    summary = list(
      total_essays = nrow(results),
      total_observations = nrow(consensus_data),
      mean_difficulty = mean(results$difficulty_logit, na.rm = TRUE),
      sd_difficulty = sd(results$difficulty_logit, na.rm = TRUE)
    )
  ))
}

# ============================================================================
# 전문가 개별 점수 기반 MFRM 캘리브레이션 (진정한 MFRM)
# ============================================================================

#' 전문가 개별 점수 기반 캘리브레이션
#' 
#' 여러 전문가의 개별 채점 데이터를 사용하여 MFRM 분석 수행
#' 에세이 난이도와 전문가 엄격성을 동시에 추정
#' 
#' @param expert_scores data.frame with columns: expert_id, essay_id, rubric_id, score
#' @return list with calibration results
#' @export
run_expert_calibration <- function(expert_scores) {
  tryCatch({
    message("=== 전문가 개별 점수 기반 MFRM 캘리브레이션 ===")
    
    # 데이터 검증
    validate_expert_scores(expert_scores)
    
    n_experts <- length(unique(expert_scores$expert_id))
    n_essays <- length(unique(expert_scores$essay_id))
    n_rubrics <- length(unique(expert_scores$rubric_id))
    n_scores <- nrow(expert_scores)
    
    message(sprintf("데이터: 전문가 %d명, 에세이 %d편, 평가요소 %d개, 총 %d개 점수",
                    n_experts, n_essays, n_rubrics, n_scores))
    
    # 데이터 준비: MFRM용 wide format
    prepared_data <- prepare_expert_data(expert_scores)
    
    message(sprintf("Response matrix: %d rows × %d items", 
                    nrow(prepared_data$response_matrix),
                    ncol(prepared_data$response_matrix)))
    
    # TAM 모델 피팅
    message("TAM 모델 피팅 중...")
    
    # Rating Scale Model로 분석
    # 각 expert × (essay_rubric) 조합이 하나의 관측치
    model <- TAM::tam.mml(
      resp = prepared_data$response_matrix,
      irtmodel = "RSM",
      control = list(
        maxiter = 1000,
        convD = 0.0001,
        snodes = 2000,
        progress = TRUE
      )
    )
    
    # 수렴 확인
    converged <- !is.null(model$converged) && model$converged
    if (!converged) {
      warning("⚠ 모델이 수렴하지 않았습니다.")
    } else {
      message("✓ 모델 수렴 완료")
    }
    
    # 에세이 난이도 파라미터 추출
    essay_params <- extract_essay_difficulties_from_expert(model, prepared_data, expert_scores)
    
    # 전문가 엄격성 추출 (참고용)
    expert_params <- extract_expert_severity(model, prepared_data, expert_scores)
    
    # 적합도 통계
    fit_stats <- list(
      deviance = model$deviance,
      aic = model$ic$AIC,
      bic = model$ic$BIC,
      npar = model$ic$Npars
    )
    
    # 분리 신뢰도 계산
    separation_reliability <- calculate_separation_reliability(essay_params)
    
    message("=== 캘리브레이션 완료 ===")
    message(sprintf("에세이 분리 신뢰도: %.3f", separation_reliability))
    
    return(list(
      success = TRUE,
      converged = converged,
      method = "expert_mfrm",
      essay_parameters = essay_params,
      expert_parameters = expert_params,
      fit_statistics = fit_stats,
      separation_reliability = separation_reliability,
      summary = list(
        total_experts = n_experts,
        total_essays = nrow(essay_params),
        total_observations = n_scores,
        mean_difficulty = mean(essay_params$difficulty_logit, na.rm = TRUE),
        sd_difficulty = sd(essay_params$difficulty_logit, na.rm = TRUE)
      )
    ))
    
  }, error = function(e) {
    message(sprintf("❌ 캘리브레이션 실패: %s", e$message))
    
    # TAM 실패 시 간단한 방법으로 대체
    message("간단한 방법으로 대체 실행...")
    return(run_simple_expert_calibration(expert_scores))
  })
}

#' 전문가 점수 데이터 검증
validate_expert_scores <- function(data) {
  required_cols <- c("expert_id", "essay_id", "rubric_id", "score")
  missing_cols <- setdiff(required_cols, names(data))
  
  if (length(missing_cols) > 0) {
    stop(paste("필수 컬럼 누락:", paste(missing_cols, collapse = ", ")))
  }
  
  n_experts <- length(unique(data$expert_id))
  n_essays <- length(unique(data$essay_id))
  
  if (n_experts < 3) {
    stop(sprintf("전문가 부족: %d명 (최소 3명 필요)", n_experts))
  }
  
  if (n_essays < 10) {
    stop(sprintf("에세이 부족: %d편 (최소 10편 필요)", n_essays))
  }
  
  if (any(data$score < 1 | data$score > 3)) {
    stop("점수는 1, 2, 3 중 하나여야 합니다.")
  }
  
  message(sprintf("✓ 데이터 검증 통과"))
}

#' 전문가 점수 데이터 준비
prepare_expert_data <- function(data) {
  # 각 expert를 person(행), essay_rubric 조합을 item(열)으로 변환
  
  experts <- unique(data$expert_id)
  data$item_id <- paste(data$essay_id, data$rubric_id, sep = "_")
  items <- unique(data$item_id)
  
  # Response matrix: n_experts × n_items
  response_matrix <- matrix(NA, nrow = length(experts), ncol = length(items))
  rownames(response_matrix) <- experts
  colnames(response_matrix) <- items
  
  for (i in 1:nrow(data)) {
    expert_idx <- which(experts == data$expert_id[i])
    item_idx <- which(items == data$item_id[i])
    # 점수를 0-indexed로 변환 (TAM은 0부터 시작)
    response_matrix[expert_idx, item_idx] <- data$score[i] - 1
  }
  
  return(list(
    response_matrix = response_matrix,
    mapping = list(
      experts = experts,
      items = items,
      essays = unique(data$essay_id),
      rubrics = unique(data$rubric_id)
    )
  ))
}

#' 에세이 난이도 추출 (전문가 기반)
extract_essay_difficulties_from_expert <- function(model, prepared_data, original_data) {
  item_params <- model$xsi
  items <- prepared_data$mapping$items
  essays <- prepared_data$mapping$essays
  
  # Item fit statistics
  item_fit <- tryCatch(TAM::tam.fit(model), error = function(e) NULL)
  
  results <- data.frame(
    essay_id = essays,
    difficulty_logit = numeric(length(essays)),
    difficulty_se = numeric(length(essays)),
    infit = numeric(length(essays)),
    outfit = numeric(length(essays)),
    mean_score = numeric(length(essays)),
    sd_score = numeric(length(essays)),
    expert_count = numeric(length(essays)),
    stringsAsFactors = FALSE
  )
  
  for (i in 1:length(essays)) {
    essay_id <- essays[i]
    essay_items <- grep(paste0("^", essay_id, "_"), items, value = TRUE)
    essay_item_indices <- which(items %in% essay_items)
    
    if (length(essay_item_indices) > 0) {
      # 해당 에세이의 item parameters 평균
      essay_xsi <- item_params[essay_item_indices, "xsi"]
      results$difficulty_logit[i] <- mean(essay_xsi, na.rm = TRUE)
      results$difficulty_se[i] <- sd(essay_xsi, na.rm = TRUE) / sqrt(length(essay_xsi))
      
      # fit statistics
      if (!is.null(item_fit)) {
        results$infit[i] <- mean(item_fit$itemfit$Infit[essay_item_indices], na.rm = TRUE)
        results$outfit[i] <- mean(item_fit$itemfit$Outfit[essay_item_indices], na.rm = TRUE)
      } else {
        results$infit[i] <- 1.0
        results$outfit[i] <- 1.0
      }
      
      # 원본 데이터에서 평균 점수 계산
      essay_scores <- original_data[original_data$essay_id == essay_id, ]
      results$mean_score[i] <- mean(essay_scores$score, na.rm = TRUE)
      results$sd_score[i] <- sd(essay_scores$score, na.rm = TRUE)
      results$expert_count[i] <- length(unique(essay_scores$expert_id))
    }
  }
  
  # 95% CI 계산
  results$difficulty_ci_lower <- results$difficulty_logit - 1.96 * results$difficulty_se
  results$difficulty_ci_upper <- results$difficulty_logit + 1.96 * results$difficulty_se
  
  message(sprintf("✓ %d개 에세이 난이도 추출 완료", nrow(results)))
  
  return(results)
}

#' 전문가 엄격성 추출
extract_expert_severity <- function(model, prepared_data, original_data) {
  # Person parameters (theta) = 전문가 엄격성의 역수
  # 높은 theta = 관대 (점수를 높게 줌)
  person_params <- TAM::tam.wle(model)
  
  experts <- prepared_data$mapping$experts
  
  results <- data.frame(
    expert_id = experts,
    severity = -person_params$theta,  # 부호 반전: 높은 값 = 엄격
    severity_se = person_params$error,
    stringsAsFactors = FALSE
  )
  
  # 원본 데이터에서 평균 점수 계산
  for (i in 1:nrow(results)) {
    expert_id <- results$expert_id[i]
    expert_scores <- original_data[original_data$expert_id == expert_id, ]
    results$mean_score[i] <- mean(expert_scores$score, na.rm = TRUE)
    results$total_ratings[i] <- nrow(expert_scores)
  }
  
  message(sprintf("✓ %d명 전문가 엄격성 추출 완료", nrow(results)))
  
  return(results)
}

#' 간단한 전문가 기반 캘리브레이션 (TAM 실패 시 대체)
run_simple_expert_calibration <- function(expert_scores) {
  message("=== 간단한 전문가 기반 캘리브레이션 ===")
  
  # 에세이별 통계
  essay_stats <- expert_scores %>%
    group_by(essay_id) %>%
    summarise(
      mean_score = mean(score, na.rm = TRUE),
      sd_score = sd(score, na.rm = TRUE),
      expert_count = n_distinct(expert_id),
      total_scores = n(),
      .groups = "drop"
    ) %>%
    mutate(
      # logit 변환
      p = (mean_score - 1) / 2,
      p = pmax(0.01, pmin(0.99, p)),
      difficulty_logit = -log(p / (1 - p)),
      difficulty_se = sd_score / sqrt(total_scores)
    )
  
  results <- data.frame(
    essay_id = essay_stats$essay_id,
    difficulty_logit = essay_stats$difficulty_logit,
    difficulty_se = essay_stats$difficulty_se,
    mean_score = essay_stats$mean_score,
    sd_score = essay_stats$sd_score,
    expert_count = essay_stats$expert_count,
    infit = 1.0,
    outfit = 1.0,
    stringsAsFactors = FALSE
  )
  
  results$difficulty_ci_lower <- results$difficulty_logit - 1.96 * results$difficulty_se
  results$difficulty_ci_upper <- results$difficulty_logit + 1.96 * results$difficulty_se
  
  # 전문가별 통계
  expert_stats <- expert_scores %>%
    group_by(expert_id) %>%
    summarise(
      mean_score = mean(score, na.rm = TRUE),
      total_ratings = n(),
      .groups = "drop"
    ) %>%
    mutate(
      severity = -(mean_score - mean(mean_score)) / sd(mean_score),  # z-score 기반
      severity_se = 1 / sqrt(total_ratings)
    )
  
  expert_params <- data.frame(
    expert_id = expert_stats$expert_id,
    severity = expert_stats$severity,
    severity_se = expert_stats$severity_se,
    mean_score = expert_stats$mean_score,
    total_ratings = expert_stats$total_ratings,
    stringsAsFactors = FALSE
  )
  
  separation_reliability <- calculate_separation_reliability(results)
  
  return(list(
    success = TRUE,
    converged = TRUE,
    method = "simple_expert",
    essay_parameters = results,
    expert_parameters = expert_params,
    fit_statistics = list(deviance = NA, aic = NA, bic = NA),
    separation_reliability = separation_reliability,
    summary = list(
      total_experts = nrow(expert_params),
      total_essays = nrow(results),
      total_observations = nrow(expert_scores),
      mean_difficulty = mean(results$difficulty_logit, na.rm = TRUE),
      sd_difficulty = sd(results$difficulty_logit, na.rm = TRUE)
    )
  ))
}

# 테스트 함수
test_calibration <- function() {
  # 테스트 데이터 생성: 전문가 5명 × 에세이 20편 × 평가요소 8개
  set.seed(123)
  
  experts <- paste0("expert_", 1:5)
  essays <- paste0("essay_", 1:20)
  rubrics <- paste0("rubric_", 1:8)
  
  # 전문가별 엄격성 (일부는 엄격, 일부는 관대)
  expert_severity <- setNames(c(-0.3, -0.1, 0, 0.1, 0.3), experts)
  
  # 에세이별 난이도
  essay_difficulties <- setNames(runif(20, -1, 1), essays)
  
  test_data <- expand.grid(
    expert_id = experts,
    essay_id = essays,
    rubric_id = rubrics,
    stringsAsFactors = FALSE
  )
  
  # 점수 생성 (난이도 + 엄격성 + 노이즈)
  test_data$score <- sapply(1:nrow(test_data), function(i) {
    logit <- -essay_difficulties[test_data$essay_id[i]] - expert_severity[test_data$expert_id[i]] + rnorm(1, 0, 0.3)
    prob <- 1 / (1 + exp(-logit))
    # 확률에 따라 1, 2, 3 점수 결정
    if (prob < 0.33) return(1)
    else if (prob < 0.67) return(2)
    else return(3)
  })
  
  message("테스트 데이터 생성 완료")
  message(sprintf("전문가: %d명, 에세이: %d편, 총 점수: %d개", 
                  length(experts), length(essays), nrow(test_data)))
  
  # 캘리브레이션 실행
  result <- run_simple_expert_calibration(test_data)
  
  message("\n=== 테스트 결과 ===")
  message(sprintf("성공: %s", result$success))
  message(sprintf("에세이 수: %d", result$summary$total_essays))
  message(sprintf("분리 신뢰도: %.3f", result$separation_reliability))
  
  cat("\n에세이 파라미터:\n")
  print(head(result$essay_parameters))
  
  cat("\n전문가 파라미터:\n")
  print(result$expert_parameters)
  
  return(result)
}

