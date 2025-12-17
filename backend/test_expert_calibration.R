# 전문가 5명 캘리브레이션 테스트
# 가상 데이터로 MFRM 캘리브레이션 테스트

source("calibration.R")

cat("=" ,rep("=", 60), "\n", sep="")
cat("전문가 5명 MFRM 캘리브레이션 테스트\n")
cat("=" ,rep("=", 60), "\n\n", sep="")

# 테스트 데이터 생성
set.seed(2024)

# 전문가 5명
experts <- c("김전문", "이전문", "박전문", "최전문", "정전문")
expert_ids <- paste0("expert_", 1:5)

# 에세이 24편 (캘리브레이션 최소 요구량)
essays <- paste0("essay_", 1:24)

# 평가요소 8개
rubrics <- paste0("rubric_", 1:8)

# 전문가별 엄격성 (양수 = 관대, 음수 = 엄격)
# MFRM에서 추정할 "진짜" 값
true_expert_severity <- c(
  expert_1 = 0.0,    # 중립
  expert_2 = -0.5,   # 엄격
  expert_3 = 0.2,    # 약간 관대
  expert_4 = 0.5,    # 관대
  expert_5 = -0.2    # 약간 엄격
)

# 에세이별 난이도 (양수 = 어려움, 음수 = 쉬움)
# MFRM에서 추정할 "진짜" 값
true_essay_difficulty <- runif(24, -1.5, 1.5)
names(true_essay_difficulty) <- essays

cat("=== 시뮬레이션 파라미터 ===\n")
cat("\n전문가 엄격성 (진짜 값):\n")
for (i in 1:5) {
  severity <- true_expert_severity[i]
  label <- ifelse(severity < -0.3, "(엄격)", ifelse(severity > 0.3, "(관대)", "(중립)"))
  cat(sprintf("  %s: %+.2f %s\n", experts[i], severity, label))
}

cat("\n에세이 난이도 (진짜 값):\n")
cat(sprintf("  범위: %.2f ~ %.2f\n", min(true_essay_difficulty), max(true_essay_difficulty)))
cat(sprintf("  평균: %.2f, SD: %.2f\n", mean(true_essay_difficulty), sd(true_essay_difficulty)))

# 테스트 데이터 생성
cat("\n=== 테스트 데이터 생성 ===\n")

test_data <- expand.grid(
  expert_id = expert_ids,
  essay_id = essays,
  rubric_id = rubrics,
  stringsAsFactors = FALSE
)

# 점수 생성 (MFRM 모형: logit(P) = theta - beta - gamma)
# theta = 전문가 관대성 (엄격성의 역수)
# beta = 에세이 난이도
# gamma = 평가요소 난이도 (여기서는 0으로 가정)

test_data$score <- sapply(1:nrow(test_data), function(i) {
  expert <- test_data$expert_id[i]
  essay <- test_data$essay_id[i]
  
  # logit 계산 (관대성 - 난이도)
  logit <- -true_expert_severity[expert] - true_essay_difficulty[essay] + rnorm(1, 0, 0.3)
  
  # 확률로 변환
  prob <- 1 / (1 + exp(-logit))
  
  # 3점 척도로 변환
  if (prob < 0.33) return(1)
  else if (prob < 0.67) return(2)
  else return(3)
})

cat(sprintf("생성된 데이터: %d개 관측치\n", nrow(test_data)))
cat(sprintf("  전문가: %d명\n", length(experts)))
cat(sprintf("  에세이: %d편\n", length(essays)))
cat(sprintf("  평가요소: %d개\n", length(rubrics)))

# 데이터 요약
cat("\n=== 데이터 요약 ===\n")

expert_means <- aggregate(score ~ expert_id, test_data, function(x) c(mean = mean(x), sd = sd(x), n = length(x)))
expert_summary <- do.call(data.frame, expert_means)
names(expert_summary) <- c("expert_id", "mean_score", "sd_score", "n")
expert_summary$true_severity <- true_expert_severity

cat("\n전문가별 평균 점수:\n")
print(expert_summary)

essay_means <- aggregate(score ~ essay_id, test_data, mean)
essay_summary <- data.frame(
  essay_id = essay_means$essay_id,
  mean_score = essay_means$score,
  true_difficulty = true_essay_difficulty[essay_means$essay_id]
)

cat("\n에세이별 평균 점수 (상위 5개, 하위 5개):\n")
essay_sorted <- essay_summary[order(essay_summary$mean_score, decreasing = TRUE), ]
print(rbind(head(essay_sorted, 5), tail(essay_sorted, 5)))

# 캘리브레이션 실행
cat("\n")
cat("=" ,rep("=", 60), "\n", sep="")
cat("MFRM 캘리브레이션 실행\n")
cat("=" ,rep("=", 60), "\n\n", sep="")

result <- run_expert_calibration(test_data)

if (result$success) {
  cat("\n=== 캘리브레이션 결과 ===\n")
  cat(sprintf("성공: %s\n", result$success))
  cat(sprintf("수렴: %s\n", result$converged))
  cat(sprintf("방법: %s\n", result$method))
  cat(sprintf("분리 신뢰도: %.3f\n", result$separation_reliability))
  
  cat("\n--- 요약 통계 ---\n")
  cat(sprintf("총 전문가: %d명\n", result$summary$total_experts))
  cat(sprintf("총 에세이: %d편\n", result$summary$total_essays))
  cat(sprintf("총 관측치: %d개\n", result$summary$total_observations))
  cat(sprintf("난이도 평균: %.3f\n", result$summary$mean_difficulty))
  cat(sprintf("난이도 SD: %.3f\n", result$summary$sd_difficulty))
  
  cat("\n--- 에세이 파라미터 (상위 5개, 하위 5개) ---\n")
  essay_params <- result$essay_parameters
  essay_params$true_diff <- true_essay_difficulty[essay_params$essay_id]
  essay_params_sorted <- essay_params[order(essay_params$difficulty_logit, decreasing = TRUE), ]
  print(rbind(head(essay_params_sorted[, c("essay_id", "difficulty_logit", "difficulty_se", "mean_score", "true_diff")], 5),
              tail(essay_params_sorted[, c("essay_id", "difficulty_logit", "difficulty_se", "mean_score", "true_diff")], 5)))
  
  cat("\n--- 전문가 파라미터 ---\n")
  expert_params <- result$expert_parameters
  expert_params$true_severity <- true_expert_severity[expert_params$expert_id]
  expert_params$expert_name <- experts[as.numeric(gsub("expert_", "", expert_params$expert_id))]
  print(expert_params[, c("expert_name", "severity", "severity_se", "mean_score", "true_severity")])
  
  # 추정치와 진짜 값의 상관관계
  cat("\n=== 추정 정확도 검증 ===\n")
  
  essay_cor <- cor(essay_params$difficulty_logit, essay_params$true_diff)
  cat(sprintf("에세이 난이도: 추정값-진짜값 상관계수 = %.3f\n", essay_cor))
  
  expert_cor <- cor(expert_params$severity, expert_params$true_severity)
  cat(sprintf("전문가 엄격성: 추정값-진짜값 상관계수 = %.3f\n", expert_cor))
  
  if (essay_cor > 0.7 && expert_cor > 0.7) {
    cat("\n✅ 캘리브레이션 성공! 추정치가 진짜 값과 높은 상관관계를 보입니다.\n")
  } else if (essay_cor > 0.5 && expert_cor > 0.5) {
    cat("\n⚠️ 캘리브레이션 부분 성공. 추정치가 진짜 값과 중간 수준의 상관관계를 보입니다.\n")
  } else {
    cat("\n❌ 캘리브레이션 주의 필요. 추정치와 진짜 값의 상관관계가 낮습니다.\n")
  }
  
} else {
  cat("\n❌ 캘리브레이션 실패!\n")
  cat(sprintf("에러: %s\n", result$error))
}

cat("\n")
cat("=" ,rep("=", 60), "\n", sep="")
cat("테스트 완료\n")
cat("=" ,rep("=", 60), "\n", sep="")

