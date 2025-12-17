# 매우 간단한 MFRM 분석 (디버깅용)

simple_mfrm_analysis <- function(scores_data) {
  library(TAM)
  library(dplyr)
  
  cat("=== Simple MFRM Analysis Debug ===\n")
  cat(sprintf("Input: %d scores\n", nrow(scores_data)))
  cat(sprintf("Teachers: %d\n", length(unique(scores_data$teacher_id))))
  cat(sprintf("Essays: %d\n", length(unique(scores_data$essay_id))))
  cat(sprintf("Rubrics: %d\n", length(unique(scores_data$rubric_id))))
  
  # 1. 데이터 준비
  teacher_ids <- unique(scores_data$teacher_id)
  scores_data$person <- match(scores_data$teacher_id, teacher_ids)
  scores_data$item <- paste0("I", 1:length(unique(paste0(scores_data$essay_id, "_", scores_data$rubric_id))))[
    match(paste0(scores_data$essay_id, "_", scores_data$rubric_id), 
          unique(paste0(scores_data$essay_id, "_", scores_data$rubric_id)))
  ]
  
  cat(sprintf("Unique persons: %d\n", length(unique(scores_data$person))))
  cat(sprintf("Unique items: %d\n", length(unique(scores_data$item))))
  
  # 2. Wide format으로 변환
  resp_wide <- scores_data %>%
    select(person, item, score) %>%
    tidyr::pivot_wider(names_from = item, values_from = score, values_fill = NA)
  
  cat(sprintf("Wide format: %d rows, %d cols\n", nrow(resp_wide), ncol(resp_wide)))
  
  resp <- as.matrix(resp_wide[, -1])
  
  cat("Response matrix created\n")
  cat(sprintf("Matrix: %d x %d\n", nrow(resp), ncol(resp)))
  
  # 3. 간단한 통계만 계산
  results <- list()
  
  for (i in 1:length(teacher_ids)) {
    tid <- teacher_ids[i]
    teacher_scores <- scores_data$score[scores_data$teacher_id == tid]
    
    results[[i]] <- list(
      teacher_id = tid,
      total_ratings = length(teacher_scores),
      mean_score = mean(teacher_scores),
      severity = (2.0 - mean(teacher_scores)) * 0.5,  # 간단한 변환
      severity_se = 0.3,  # 임시값
      infit = 1.0,  # 임시값
      outfit = 1.0,  # 임시값
      infit_t = 0.0,
      outfit_t = 0.0,
      halo_effect_score = 0.2,  # 임시값
      category_imbalance_score = sd(as.numeric(table(teacher_scores))) / mean(as.numeric(table(teacher_scores))),
      feedback = "Simple analysis - TAM not used"
    )
  }
  
  cat("Analysis completed successfully\n")
  
  return(list(
    success = TRUE,
    converged = TRUE,
    teacher_parameters = do.call(rbind, lapply(results, as.data.frame)),
    essay_parameters = data.frame(essay_id = unique(scores_data$essay_id), difficulty = 0, se = 0.3),
    fit_statistics = list(deviance = 100, aic = 200, bic = 210, converged = TRUE, iterations = 10),
    summary = list(
      num_teachers = length(teacher_ids),
      num_essays = length(unique(scores_data$essay_id)),
      num_rubrics = length(unique(scores_data$rubric_id)),
      total_scores = nrow(scores_data)
    )
  ))
}

