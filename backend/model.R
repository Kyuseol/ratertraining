# MFRM Model Implementation
# Many-Facets Rasch Model using TAM package
# Updated for Blueprint v0.9: 9개 평가요소, 3점 척도, 앵커 에세이 시스템

library(TAM)
library(dplyr)

#' MFRM 분석 실행
#'
#' @param scores_data data.frame with columns: teacher_id, essay_id, rubric_id, score
#' @return list with model object, teacher parameters, essay parameters
#' @export
fit_mfrm <- function(scores_data) {
  tryCatch({
    # 데이터 검증
    validate_scores_data(scores_data)
    
    message(sprintf("Starting MFRM analysis with %d scores", nrow(scores_data)))
    
    # 데이터 준비: wide format으로 변환
    # Rows: teachers, Columns: essay × rubric combinations
    prepared_data <- prepare_data_for_tam(scores_data)
    
    # TAM MFRM 모델 피팅
    message("Fitting TAM model...")
    model <- TAM::tam.mml.mfr(
      resp = prepared_data$response_matrix,
      facets = prepared_data$facets,
      formulaA = ~ item + rater + step,  # MFRM 공식
      control = list(
        maxiter = 1000,
        convD = 0.001,
        snodes = 2000,
        QMC = TRUE,
        progress = TRUE
      )
    )
    
    # 수렴 확인
    if (!model$converged) {
      warning("⚠ Model did not converge. Results may be unreliable.")
    } else {
      message("✓ Model converged successfully")
    }
    
    # 파라미터 추출
    teacher_params <- extract_teacher_parameters(model, prepared_data)
    essay_params <- extract_essay_parameters(model, prepared_data)
    
    # 결과 반환
    return(list(
      model = model,
      converged = model$converged,
      teacher_parameters = teacher_params,
      essay_parameters = essay_params,
      fit_statistics = list(
        deviance = model$deviance,
        aic = model$ic$AIC,
        bic = model$ic$BIC
      )
    ))
    
  }, error = function(e) {
    stop(paste("MFRM analysis failed:", e$message))
  })
}

#' 데이터 검증
#'
#' @param scores_data 점수 데이터
validate_scores_data <- function(scores_data) {
  # 필수 컬럼 확인
  required_cols <- c("teacher_id", "essay_id", "rubric_id", "score")
  missing_cols <- setdiff(required_cols, names(scores_data))
  
  if (length(missing_cols) > 0) {
    stop(paste("Missing required columns:", paste(missing_cols, collapse = ", ")))
  }
  
  # 최소 데이터 요구사항
  MIN_SCORES <- 30
  MIN_TEACHERS <- 3
  MIN_ESSAYS <- 10
  
  n_scores <- nrow(scores_data)
  n_teachers <- length(unique(scores_data$teacher_id))
  n_essays <- length(unique(scores_data$essay_id))
  
  if (n_scores < MIN_SCORES) {
    stop(sprintf("Insufficient data: %d scores (minimum %d required)", 
                 n_scores, MIN_SCORES))
  }
  
  if (n_teachers < MIN_TEACHERS) {
    stop(sprintf("Insufficient raters: %d teachers (minimum %d required)", 
                 n_teachers, MIN_TEACHERS))
  }
  
  if (n_essays < MIN_ESSAYS) {
    stop(sprintf("Insufficient essays: %d essays (minimum %d required)", 
                 n_essays, MIN_ESSAYS))
  }
  
  message(sprintf("✓ Data validation passed: %d teachers, %d essays, %d scores",
                  n_teachers, n_essays, n_scores))
}

#' TAM 패키지 형식으로 데이터 변환
#'
#' @param scores_data 점수 데이터
#' @return list with response_matrix and facets
prepare_data_for_tam <- function(scores_data) {
  # 고유 ID 생성
  teachers <- unique(scores_data$teacher_id)
  essays <- unique(scores_data$essay_id)
  rubrics <- unique(scores_data$rubric_id)
  
  # Item ID 생성 (essay × rubric combinations)
  scores_data$item_id <- paste(scores_data$essay_id, scores_data$rubric_id, sep = "_")
  items <- unique(scores_data$item_id)
  
  # Response matrix 생성 (teachers × items)
  n_teachers <- length(teachers)
  n_items <- length(items)
  
  response_matrix <- matrix(NA, nrow = n_teachers, ncol = n_items)
  rownames(response_matrix) <- teachers
  colnames(response_matrix) <- items
  
  # 데이터 채우기
  for (i in 1:nrow(scores_data)) {
    teacher_idx <- which(teachers == scores_data$teacher_id[i])
    item_idx <- which(items == scores_data$item_id[i])
    response_matrix[teacher_idx, item_idx] <- scores_data$score[i]
  }
  
  # Facets 정보 생성
  item_facets <- data.frame(
    item = items,
    essay = sapply(strsplit(items, "_"), `[`, 1),
    rubric = sapply(strsplit(items, "_"), `[`, 2),
    stringsAsFactors = FALSE
  )
  
  teacher_facets <- data.frame(
    teacher = teachers,
    teacher_id = teachers,
    stringsAsFactors = FALSE
  )
  
  message(sprintf("✓ Prepared data: %d teachers × %d items", n_teachers, n_items))
  
  return(list(
    response_matrix = response_matrix,
    facets = list(
      items = item_facets,
      teachers = teacher_facets
    ),
    mapping = list(
      teachers = teachers,
      essays = essays,
      rubrics = rubrics,
      items = items
    )
  ))
}

#' 교사 파라미터 추출
#'
#' @param model TAM 모델 객체
#' @param prepared_data 준비된 데이터
#' @return data.frame with teacher parameters
extract_teacher_parameters <- function(model, prepared_data) {
  # Facet parameters 추출
  facet_params <- model$xsi.facets
  
  # 교사(rater) 파라미터만 필터링
  rater_params <- facet_params[facet_params$facet == "rater", ]
  
  # Person parameters (ability estimates)
  person_params <- TAM::tam.wle(model)
  
  # 통계 계산
  teachers <- prepared_data$mapping$teachers
  response_matrix <- prepared_data$response_matrix
  
  results <- data.frame(
    teacher_id = teachers,
    severity = numeric(length(teachers)),
    severity_se = numeric(length(teachers)),
    infit = numeric(length(teachers)),
    outfit = numeric(length(teachers)),
    mean_score = numeric(length(teachers)),
    sd_score = numeric(length(teachers)),
    total_ratings = numeric(length(teachers)),
    stringsAsFactors = FALSE
  )
  
  for (i in 1:length(teachers)) {
    teacher_id <- teachers[i]
    
    # 해당 교사의 채점 데이터
    scores <- response_matrix[i, ]
    scores <- scores[!is.na(scores)]
    
    results$mean_score[i] <- mean(scores, na.rm = TRUE)
    results$sd_score[i] <- sd(scores, na.rm = TRUE)
    results$total_ratings[i] <- length(scores)
    
    # Severity (엄격성) 추출
    if (i <= nrow(rater_params)) {
      results$severity[i] <- rater_params$xsi[i]
      results$severity_se[i] <- rater_params$se.xsi[i]
    }
    
    # Infit/Outfit (일관성) 추출
    if (i <= nrow(person_params)) {
      results$infit[i] <- person_params$infit[i]
      results$outfit[i] <- person_params$outfit[i]
    }
  }
  
  message(sprintf("✓ Extracted parameters for %d teachers", nrow(results)))
  
  return(results)
}

#' 에세이 파라미터 추출
#'
#' @param model TAM 모델 객체
#' @param prepared_data 준비된 데이터
#' @return data.frame with essay parameters
extract_essay_parameters <- function(model, prepared_data) {
  # Item parameters 추출
  item_params <- model$xsi
  
  essays <- prepared_data$mapping$essays
  response_matrix <- prepared_data$response_matrix
  
  results <- data.frame(
    essay_id = essays,
    difficulty = numeric(length(essays)),
    difficulty_se = numeric(length(essays)),
    mean_score = numeric(length(essays)),
    sd_score = numeric(length(essays)),
    stringsAsFactors = FALSE
  )
  
  # Essay별 집계
  for (i in 1:length(essays)) {
    essay_id <- essays[i]
    
    # 해당 에세이에 대한 모든 점수
    essay_items <- grep(paste0("^", essay_id, "_"), colnames(response_matrix), value = TRUE)
    scores <- as.vector(response_matrix[, essay_items])
    scores <- scores[!is.na(scores)]
    
    results$mean_score[i] <- mean(scores, na.rm = TRUE)
    results$sd_score[i] <- sd(scores, na.rm = TRUE)
    
    # Difficulty (난이도) 추출
    if (i <= length(item_params)) {
      results$difficulty[i] <- mean(item_params[grep(essay_id, names(item_params))])
      results$difficulty_se[i] <- 0.1  # 임시값
    }
  }
  
  message(sprintf("✓ Extracted parameters for %d essays", nrow(results)))
  
  return(results)
}

#' MFRM 결과 해석 및 피드백 생성
#'
#' @param teacher_params 교사 파라미터 데이터프레임
#' @return data.frame with interpretation and feedback
#' @export
interpret_mfrm_results <- function(teacher_params) {
  teacher_params$interpretation <- ""
  teacher_params$feedback <- ""
  
  for (i in 1:nrow(teacher_params)) {
    severity <- teacher_params$severity[i]
    infit <- teacher_params$infit[i]
    
    # 엄격성 해석
    severity_level <- if (is.na(severity)) {
      "분석 불가"
    } else if (severity > 0.5) {
      "매우 엄격"
    } else if (severity > 0.2) {
      "다소 엄격"
    } else if (severity > -0.2) {
      "적정"
    } else if (severity > -0.5) {
      "다소 관대"
    } else {
      "매우 관대"
    }
    
    # 일관성 해석 (Infit: 0.7-1.3 적정 범위)
    consistency_level <- if (is.na(infit)) {
      "분석 불가"
    } else if (infit < 0.7) {
      "과도하게 일관적 (의심스러운 패턴)"
    } else if (infit <= 1.3) {
      "일관적"
    } else if (infit <= 2.0) {
      "다소 불일치"
    } else {
      "매우 불일치"
    }
    
    teacher_params$interpretation[i] <- sprintf(
      "엄격성: %s, 일관성: %s", 
      severity_level, 
      consistency_level
    )
    
    # 피드백 생성
    feedback <- ""
    if (!is.na(severity)) {
      if (abs(severity) > 0.5) {
        feedback <- paste(feedback, 
          sprintf("채점 기준이 평균보다 %s합니다. 다른 교사들과 비교해보세요.", 
                  ifelse(severity > 0, "엄격", "관대")))
      }
    }
    
    if (!is.na(infit)) {
      if (infit > 1.3) {
        feedback <- paste(feedback, 
          "채점의 일관성을 높이기 위해 채점 기준을 재검토해보세요.")
      }
    }
    
    if (feedback == "") {
      feedback <- "양호한 채점 패턴을 보이고 있습니다. 계속 유지하세요!"
    }
    
    teacher_params$feedback[i] <- trimws(feedback)
  }
  
  return(teacher_params)
}

#' 헤일로 효과 계산 (Blueprint v0.9)
#' 
#' 평가요소 간 과도한 상관을 측정
#' @param scores_data 점수 데이터
#' @return 교사별 헤일로 효과 점수 (0-1, 높을수록 문제)
#' @export
calculate_halo_effect <- function(scores_data) {
  teacher_ids <- unique(scores_data$teacher_id)
  halo_scores <- numeric(length(teacher_ids))
  names(halo_scores) <- teacher_ids
  
  for (i in 1:length(teacher_ids)) {
    teacher_id <- teacher_ids[i]
    teacher_data <- scores_data[scores_data$teacher_id == teacher_id, ]
    
    # 에세이별로 루브릭 점수를 wide format으로 변환
    wide_data <- teacher_data %>%
      select(essay_id, rubric_id, score) %>%
      tidyr::pivot_wider(names_from = rubric_id, values_from = score)
    
    # 루브릭 간 상관계수 계산
    if (ncol(wide_data) > 2) {  # 최소 2개 이상의 루브릭 필요
      cor_matrix <- cor(wide_data[, -1], use = "pairwise.complete.obs")
      
      # 평균 상관계수 (대각선 제외)
      cor_values <- cor_matrix[upper.tri(cor_matrix)]
      mean_cor <- mean(abs(cor_values), na.rm = TRUE)
      
      # 0.7 이상이면 헤일로 효과 의심
      # 정규화: 0.5 → 0, 0.7 → 0.5, 0.9 → 1
      halo_scores[i] <- max(0, min(1, (mean_cor - 0.5) / 0.4))
    } else {
      halo_scores[i] <- NA
    }
  }
  
  return(halo_scores)
}

#' 범주 불균형 계산 (Blueprint v0.9)
#' 
#' 특정 점수의 과다 사용 측정
#' @param scores_data 점수 데이터
#' @return 교사별 범주 불균형 점수 (0-1, 높을수록 문제)
#' @export
calculate_category_imbalance <- function(scores_data) {
  teacher_ids <- unique(scores_data$teacher_id)
  imbalance_scores <- numeric(length(teacher_ids))
  names(imbalance_scores) <- teacher_ids
  
  # Blueprint v0.9: 3점 척도 (1, 2, 3)
  expected_proportions <- c(0.25, 0.50, 0.25)  # 이상적인 분포
  
  for (i in 1:length(teacher_ids)) {
    teacher_id <- teacher_ids[i]
    teacher_scores <- scores_data[scores_data$teacher_id == teacher_id, "score"]
    
    # 실제 분포
    score_table <- table(factor(teacher_scores, levels = 1:3))
    observed_proportions <- as.numeric(score_table) / sum(score_table)
    
    # Chi-square 거리 (정규화)
    chi_dist <- sum((observed_proportions - expected_proportions)^2 / expected_proportions)
    
    # 0-1로 정규화 (chi_dist > 0.5이면 문제)
    imbalance_scores[i] <- min(1, chi_dist / 0.5)
  }
  
  return(imbalance_scores)
}

#' 배치 재추정 품질 지표 계산 (Blueprint v0.9)
#' 
#' @param teacher_params 교사 파라미터 데이터프레임
#' @return list with quality metrics
#' @export
calculate_quality_metrics <- function(teacher_params) {
  # 인핏/아웃핏 중앙값
  median_infit <- median(teacher_params$infit, na.rm = TRUE)
  median_outfit <- median(teacher_params$outfit, na.rm = TRUE)
  
  # 분리지수 (Separation Index)
  severity_var <- var(teacher_params$severity, na.rm = TRUE)
  severity_se_mean <- mean(teacher_params$severity_se^2, na.rm = TRUE)
  separation_index <- sqrt(max(0, (severity_var - severity_se_mean) / severity_se_mean))
  
  # 극단 응답률
  extreme_response_rate <- 0  # 실제 계산은 원본 scores_data 필요
  
  # 수용 기준 체크
  accept_infit <- median_infit >= 0.7 && median_infit <= 1.3
  accept_outfit <- median_outfit >= 0.7 && median_outfit <= 1.3
  accept_separation <- separation_index >= 1.5
  
  acceptance_status <- if (accept_infit && accept_outfit && accept_separation) {
    "accepted"
  } else if (!accept_infit || !accept_outfit) {
    "rejected"
  } else {
    "warning"
  }
  
  issues <- c()
  if (!accept_infit) issues <- c(issues, sprintf("인핏 중앙값 %.2f (기준: 0.7-1.3)", median_infit))
  if (!accept_outfit) issues <- c(issues, sprintf("아웃핏 중앙값 %.2f (기준: 0.7-1.3)", median_outfit))
  if (!accept_separation) issues <- c(issues, sprintf("분리지수 %.2f (기준: ≥1.5)", separation_index))
  
  return(list(
    median_infit = median_infit,
    median_outfit = median_outfit,
    separation_index = separation_index,
    extreme_response_rate = extreme_response_rate,
    acceptance_status = acceptance_status,
    issues = issues
  ))
}

# 패키지 자동 설치 함수
install_required_packages <- function() {
  required_packages <- c("TAM", "RPostgreSQL", "plumber", "jsonlite", "dplyr", "tidyr")
  
  for (pkg in required_packages) {
    if (!require(pkg, character.only = TRUE, quietly = TRUE)) {
      message(sprintf("Installing package: %s", pkg))
      install.packages(pkg, repos = "https://cran.rstudio.com/")
      library(pkg, character.only = TRUE)
    }
  }
  
  message("✓ All required packages installed")
} 