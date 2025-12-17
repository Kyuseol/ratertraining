# MFRM R Backend

R + Plumber REST API for Many-Facets Rasch Model analysis

---

## 📋 Features

- **MFRM Analysis**: TAM 패키지를 사용한 정확한 Many-Facets Rasch Model 분석
- **REST API**: Plumber 기반 RESTful API
- **Database**: Supabase PostgreSQL 연동
- **Docker**: 컨테이너화된 배포
- **Logging**: 체계적인 로그 시스템

---

## 🚀 Quick Start

### Prerequisites

- R 4.3 이상
- Docker & Docker Compose (배포 시)
- Supabase 계정 및 프로젝트

### Local Development

1. **R 패키지 설치**
```bash
Rscript -e "install.packages(c('plumber', 'TAM', 'RPostgreSQL', 'jsonlite', 'dplyr', 'dotenv'))"
```

2. **환경 변수 설정**
```bash
cp .env.example .env
# .env 파일 편집하여 Supabase 정보 입력
```

3. **API 서버 실행**
```bash
Rscript -e "pr <- plumber::plumb('fluber.R'); pr$run(host='0.0.0.0', port=8000)"
```

4. **테스트**
```bash
curl http://localhost:8000/health
```

---

## 🐳 Docker Deployment

### Build and Run

```bash
# 빌드 및 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### Environment Variables

`.env` 파일에 필요한 환경 변수:

```bash
# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-service-role-key
SUPABASE_DB_HOST=db.your-project-id.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-password

# API
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:3000,https://your-app.netlify.app
```

---

## 📡 API Endpoints

### Health Check
```
GET /health
```

### MFRM Analysis
```
POST /api/mfrm/analyze
Body: {
  "run_name": "2025-semester1",
  "description": "첫 학기 분석",
  "teacher_ids": ["uuid1", "uuid2"],  // optional
  "essay_ids": ["uuid3", "uuid4"]     // optional
}
```

### Get Results
```
GET /api/mfrm/results/:run_id
```

### Teacher History
```
GET /api/mfrm/teacher/:teacher_id
```

### List Runs
```
GET /api/mfrm/runs?status=completed&limit=50
```

### Statistics
```
GET /api/stats/teachers
GET /api/stats/essays
GET /api/stats/latest
```

### API Info
```
GET /api/info
```

---

## 📁 File Structure

```
backend/
├── fluber.R              # Plumber API 엔드포인트
├── model.R               # MFRM 모델 구현
├── db.R                  # Supabase 연동
├── utils.R               # 유틸리티 함수
├── Dockerfile            # Docker 이미지 빌드
├── docker-compose.yml    # Docker Compose 설정
├── .env.example          # 환경 변수 예제
├── .dockerignore         # Docker 제외 파일
└── README.md             # 이 파일
```

---

## 🧪 Testing

### Manual Testing

```bash
# Health check
curl http://localhost:8000/health

# MFRM analysis
curl -X POST http://localhost:8000/api/mfrm/analyze \
  -H "Content-Type: application/json" \
  -d '{"run_name": "test-run"}'

# Get results
curl http://localhost:8000/api/mfrm/results/{run_id}
```

---

## 🔧 Configuration

### TAM Model Parameters

`model.R`에서 설정 가능:

```r
model <- TAM::tam.mml.mfr(
  resp = prepared_data$response_matrix,
  facets = prepared_data$facets,
  formulaA = ~ item + rater + step,
  control = list(
    maxiter = 1000,      # 최대 반복 횟수
    convD = 0.001,       # 수렴 기준
    snodes = 2000,       # 노드 수
    QMC = TRUE,          # Quasi-Monte Carlo
    progress = TRUE      # 진행 상황 표시
  )
)
```

### Minimum Data Requirements

```r
MIN_SCORES <- 30         # 최소 채점 데이터 수
MIN_TEACHERS <- 3        # 최소 교사 수
MIN_ESSAYS <- 10         # 최소 에세이 수
```

---

## 📊 MFRM 파라미터 해석

### Severity (엄격성)

- **양수 (+)**: 평균보다 엄격한 채점
- **음수 (-)**: 평균보다 관대한 채점
- **0 근처**: 적정 수준

| 값 | 해석 |
|---|---|
| > 0.5 | 매우 엄격 |
| 0.2 ~ 0.5 | 다소 엄격 |
| -0.2 ~ 0.2 | 적정 |
| -0.5 ~ -0.2 | 다소 관대 |
| < -0.5 | 매우 관대 |

### Infit/Outfit (일관성)

- **0.7 ~ 1.3**: 적정 범위 (일관적)
- **< 0.7**: 과도하게 일관적 (의심스러운 패턴)
- **> 1.3**: 불일치 (일관성 부족)

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# 8000 포트를 사용 중인 프로세스 확인
lsof -i :8000

# 프로세스 종료
kill -9 <PID>
```

### Database Connection Failed

1. `.env` 파일의 Supabase 정보 확인
2. 네트워크 연결 확인
3. Supabase 프로젝트가 실행 중인지 확인

### MFRM Model Not Converging

- 데이터 개수 확인 (최소 30개)
- 교사/에세이 수 확인
- `maxiter` 값 증가 (model.R)

---

## 📚 References

- [TAM Package Documentation](https://cran.r-project.org/web/packages/TAM/TAM.pdf)
- [Plumber Documentation](https://www.rplumber.io/)
- [Many-Facets Rasch Model](https://www.rasch.org/rmt/rmt103b.htm)

---

**Last Updated:** 2025-11-15

