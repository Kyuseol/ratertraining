# MFRM 분석 (데이터베이스 연결 없이)
# 프론트엔드에서 데이터를 받아 분석

#' 데이터를 직접 받아서 MFRM 분석 실행
#' 
#' @param scores_data 채점 데이터 (data.frame)
#' @return MFRM 분석 결과
analyze_mfrm_with_data <- function(scores_data) {
  library(TAM)
  library(dplyr)
  
  # 1. 데이터 검증
  if (nrow(scores_data) < 30) {
    stop("Insufficient data: At least 30 scores required")
  }
  
  required_cols <- c("teacher_id", "essay_id", "rubric_id", "score")
  missing_cols <- setdiff(required_cols, names(scores_data))
  if (length(missing_cols) > 0) {
    stop(paste("Missing required columns:", paste(missing_cols, collapse = ", ")))
  }
  
  # 2. 데이터 변환 (long format 유지)
  # TAM의 간단한 모델 사용
  cat("Preparing data for MFRM analysis...\n")
  
  # 각 교사의 고유 ID 매핑
  teacher_ids <- unique(scores_data$teacher_id)
  scores_data$person_id <- match(scores_data$teacher_id, teacher_ids)
  
  # 아이템 ID 생성 (에세이 x 루브릭)
  scores_data$item_id <- paste0("E", scores_data$essay_id, "_R", scores_data$rubric_id)
  
  # Wide format 변환
  resp_wide <- scores_data %>%
    select(person_id, item_id, score) %>%
    tidyr::pivot_wider(
      names_from = item_id,
      values_from = score,
      values_fill = NA
    ) %>%
    arrange(person_id)
  
  # 응답 행렬
  resp_matrix <- as.matrix(resp_wide[, -1])
  
  # 3. 간단한 TAM 모델 피팅 (Rasch 모델)
  cat("Fitting Rasch model with TAM...\n")
  
  tryCatch({
    model <- tam.mml(
      resp = resp_matrix,
      control = list(
        maxiter = 100,
        conv = 0.001,
        progress = FALSE
      )
    )
    
    # 4. 교사 파라미터 추출
    cat(sprintf("Model converged: %s\n", model$converged))
    cat(sprintf("Number of persons: %d\n", nrow(model$person)))
    cat(sprintf("Number of teacher_ids: %d\n", length(teacher_ids)))
    
    # 안전하게 파라미터 추출
    if (is.null(model$person) || nrow(model$person) == 0) {
      stop("Model did not produce person parameters")
    }
    
    teacher_params <- data.frame(
      teacher_id = teacher_ids,
      theta = model$person$EAP,
      se = model$person$SE.EAP,
      stringsAsFactors = FALSE
    )
    
    # Theta를 Severity로 변환 (역코딩: 높은 theta = 낮은 점수 = 엄격)
    teacher_params$severity <- -teacher_params$theta
    teacher_params$severity_se <- teacher_params$se
    
    # 5. 적합도 통계 계산
    cat("Calculating fit statistics...\n")
    tryCatch({
      fit_stats <- tam.fit(model)
      if (!is.null(fit_stats$personfit) && 
          length(fit_stats$personfit$Infit) == nrow(teacher_params)) {
        teacher_params$infit <- fit_stats$personfit$Infit
        teacher_params$outfit <- fit_stats$personfit$Outfit
        teacher_params$infit_t <- fit_stats$personfit$Infit_t
        teacher_params$outfit_t <- fit_stats$personfit$Outfit_t
        cat("Fit statistics calculated successfully\n")
      } else {
        # Fallback: 기본값 사용
        cat("Using default fit values (personfit unavailable or mismatched)\n")
        teacher_params$infit <- rep(1.0, nrow(teacher_params))
        teacher_params$outfit <- rep(1.0, nrow(teacher_params))
        teacher_params$infit_t <- rep(0.0, nrow(teacher_params))
        teacher_params$outfit_t <- rep(0.0, nrow(teacher_params))
      }
    }, error = function(e) {
      cat(sprintf("Fit calculation failed: %s. Using defaults.\n", e$message))
      teacher_params$infit <<- rep(1.0, nrow(teacher_params))
      teacher_params$outfit <<- rep(1.0, nrow(teacher_params))
      teacher_params$infit_t <<- rep(0.0, nrow(teacher_params))
      teacher_params$outfit_t <<- rep(0.0, nrow(teacher_params))
    })
    
    # 6. 추가 지표 계산
    # 컬럼 초기화
    teacher_params$mean_score <- NA_real_
    teacher_params$total_ratings <- NA_integer_
    teacher_params$halo_effect_score <- NA_real_
    teacher_params$category_imbalance_score <- NA_real_
    
    for (i in 1:nrow(teacher_params)) {
      tid <- teacher_params$teacher_id[i]
      # 벡터로 직접 추출 (데이터프레임 서브셋 문제 방지)
      teacher_scores <- scores_data$score[scores_data$teacher_id == tid]
      
      # 평균 점수
      teacher_params$mean_score[i] <- mean(teacher_scores, na.rm = TRUE)
      teacher_params$total_ratings[i] <- length(teacher_scores)
      
      # 헤일로 효과 (루브릭 간 점수 상관)
      tryCatch({
        teacher_rubric_scores <- scores_data %>%
          filter(teacher_id == tid) %>%
          group_by(essay_id, rubric_id) %>%
          summarise(score = mean(score), .groups = "drop") %>%
          tidyr::pivot_wider(names_from = rubric_id, values_from = score)
        
        if (ncol(teacher_rubric_scores) > 2) {
          numeric_cols <- teacher_rubric_scores[, -1, drop = FALSE]
          if (ncol(numeric_cols) >= 2) {
            cor_matrix <- cor(numeric_cols, use = "pairwise.complete.obs")
            teacher_params$halo_effect_score[i] <- mean(cor_matrix[upper.tri(cor_matrix)], na.rm = TRUE)
          } else {
            teacher_params$halo_effect_score[i] <- NA
          }
        } else {
          teacher_params$halo_effect_score[i] <- NA
        }
      }, error = function(e) {
        teacher_params$halo_effect_score[i] <<- NA
      })
      
      # 범주 불균형
      if (length(teacher_scores) > 0) {
        score_table <- table(teacher_scores)
        if (length(score_table) > 1) {
          teacher_params$category_imbalance_score[i] <- sd(as.numeric(score_table)) / mean(as.numeric(score_table))
        } else {
          teacher_params$category_imbalance_score[i] <- 1.0
        }
      } else {
        teacher_params$category_imbalance_score[i] <- NA
      }
    }
    
    # 7. 아이템 난이도 추출
    item_params <- data.frame(
      item = colnames(resp_matrix),
      difficulty = model$xsi$xsi,
      se = model$xsi$se.xsi,
      stringsAsFactors = FALSE
    )
    
    # 에세이 ID 추출
    item_params$essay_id <- gsub("E(.*)_R.*", "\\1", item_params$item)
    
    essay_difficulties <- item_params %>%
      group_by(essay_id) %>%
      summarise(
        difficulty = mean(difficulty),
        se = mean(se),
        .groups = "drop"
      )
    
    # 8. 모델 적합도
    fit_stats <- list(
      deviance = model$deviance,
      aic = model$ic$AIC,
      bic = model$ic$BIC,
      converged = model$converged,
      iterations = model$iter
    )
    
    # 9. 결과 반환
    return(list(
      success = TRUE,
      converged = model$converged,
      teacher_parameters = teacher_params,
      essay_parameters = essay_difficulties,
      fit_statistics = fit_stats,
      summary = list(
        num_teachers = nrow(teacher_params),
        num_essays = length(unique(scores_data$essay_id)),
        num_rubrics = length(unique(scores_data$rubric_id)),
        total_scores = nrow(scores_data)
      )
    ))
    
  }, error = function(e) {
    return(list(
      success = FALSE,
      error = e$message
    ))
  })
}

#' 피드백 생성
#' 
#' @param teacher_params 교사 파라미터
#' @return 피드백이 추가된 교사 파라미터
interpret_mfrm_results_no_db <- function(teacher_params) {
  teacher_params$feedback <- ""
  
  for (i in 1:nrow(teacher_params)) {
    feedback_parts <- c()
    
    # 엄격성 피드백
    if (abs(teacher_params$severity[i]) > 0.5) {
      if (teacher_params$severity[i] > 0) {
        feedback_parts <- c(feedback_parts, "엄격한 채점 경향")
      } else {
        feedback_parts <- c(feedback_parts, "관대한 채점 경향")
      }
    }
    
    # 일관성 피드백
    if (teacher_params$infit[i] > 1.3 || teacher_params$outfit[i] > 1.3) {
      feedback_parts <- c(feedback_parts, "일관성 개선 필요")
    } else if (teacher_params$infit[i] < 0.7 || teacher_params$outfit[i] < 0.7) {
      feedback_parts <- c(feedback_parts, "과도하게 일관적 (재검토 필요)")
    }
    
    # 헤일로 효과
    if (!is.na(teacher_params$halo_effect_score[i]) && teacher_params$halo_effect_score[i] > 0.7) {
      feedback_parts <- c(feedback_parts, "헤일로 효과 주의")
    }
    
    # 범주 불균형
    if (teacher_params$category_imbalance_score[i] > 0.5) {
      feedback_parts <- c(feedback_parts, "범주 사용 불균형")
    }
    
    if (length(feedback_parts) == 0) {
      teacher_params$feedback[i] <- "채점 품질 양호"
    } else {
      teacher_params$feedback[i] <- paste(feedback_parts, collapse = ", ")
    }
  }
  
  return(teacher_params)
}

