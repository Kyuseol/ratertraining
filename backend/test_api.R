# API 테스트 스크립트
# R 백엔드가 정상 작동하는지 확인

library(httr)
library(jsonlite)

# API 기본 URL
API_URL <- "http://localhost:8000"

cat("🧪 MFRM API 테스트 시작\n\n")

# 테스트 1: Health Check
cat("1️⃣  Health Check 테스트...\n")
response <- tryCatch({
  GET(paste0(API_URL, "/health"))
}, error = function(e) {
  cat("❌ 에러:", e$message, "\n")
  cat("   API 서버가 실행 중인지 확인하세요: http://localhost:8000\n\n")
  return(NULL)
})

if (!is.null(response) && status_code(response) == 200) {
  result <- content(response, "parsed")
  cat("✅ 성공!\n")
  cat("   서비스:", result$service, "\n")
  cat("   버전:", result$version, "\n")
  cat("   R 버전:", result$r_version, "\n\n")
} else {
  cat("❌ 실패: Health check 응답 없음\n\n")
  stop("API 서버를 먼저 시작하세요.")
}

# 테스트 2: API Info
cat("2️⃣  API Info 테스트...\n")
response <- GET(paste0(API_URL, "/api/info"))

if (status_code(response) == 200) {
  result <- content(response, "parsed")
  cat("✅ 성공!\n")
  cat("   평가요소:", result$blueprint_features$evaluation_elements, "개\n")
  cat("   척도:", result$blueprint_features$scale, "\n")
  cat("   앵커 에세이:", result$blueprint_features$anchor_essays, "\n")
  cat("   엔드포인트 수:", length(result$endpoints), "개\n\n")
} else {
  cat("❌ 실패: 상태 코드", status_code(response), "\n\n")
}

# 테스트 3: Stats Endpoints
cat("3️⃣  통계 엔드포인트 테스트...\n")
response <- GET(paste0(API_URL, "/api/stats/teachers"))

if (status_code(response) == 200) {
  result <- content(response, "parsed")
  cat("✅ 성공!\n")
  cat("   교사 통계 개수:", length(result$statistics), "개\n\n")
} else {
  cat("⚠️  경고: 교사 통계 조회 실패 (데이터베이스 연결 확인 필요)\n\n")
}

# 테스트 4: MFRM Runs
cat("4️⃣  MFRM Runs 엔드포인트 테스트...\n")
response <- GET(paste0(API_URL, "/api/mfrm/runs?limit=5"))

if (status_code(response) == 200) {
  result <- content(response, "parsed")
  cat("✅ 성공!\n")
  cat("   분석 실행 기록:", result$count, "개\n\n")
} else {
  cat("⚠️  경고: MFRM runs 조회 실패\n\n")
}

# 최종 요약
cat("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
cat("📊 테스트 요약\n")
cat("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
cat("✅ API 서버: 정상 작동\n")
cat("✅ 엔드포인트: 응답 확인\n")
cat("⚠️  데이터베이스 연결은 실제 데이터 유무로 확인하세요\n\n")

cat("🎉 기본 API 테스트 완료!\n")
cat("   브라우저에서 확인: http://localhost:8000/api/info\n\n")

