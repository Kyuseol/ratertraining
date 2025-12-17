# 🚀 MFRM 시스템 실행 가이드

프론트엔드와 백엔드 실행 방법을 안내합니다.

---

## 📋 사전 요구사항

| 구성요소 | 버전 | 확인 명령어 |
|---------|------|------------|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| R | 4.2+ | `Rscript --version` |

---

## ⚡ 빠른 실행 (이미 설정 완료된 경우)

### 방법 1: PowerShell 스크립트 사용 (권장)

**터미널 1 - 백엔드:**
```powershell
cd backend
.\start_api.ps1
```

**터미널 2 - 프론트엔드:**
```powershell
cd frontend
.\start_app.ps1
```

> **참고**: PowerShell 실행 정책 오류가 발생하면:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

### 방법 2: 배치 파일 사용 (CMD)

**터미널 1 - 백엔드:**
```cmd
cd backend
start_api.ps1
```


**터미널 2 - 프론트엔드:**
```cmd
cd frontend
start_app.bat
```

> **PowerShell에서 .bat 실행 시**: `.\start_api.bat` 형식으로 실행하세요.

### 방법 3: 직접 명령어 실행

**터미널 1 - 백엔드:**
```bash
cd backend
Rscript -e "pr <- plumber::plumb('fluber.R'); pr$run(host='0.0.0.0', port=8000)"
```

**터미널 2 - 프론트엔드:**
```bash
cd frontend
npm start
```

### 접속 URL
- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:8000
- **API 상태 확인**: http://localhost:8000/health

---

## 🔧 처음 설정하는 경우

### 1단계: 환경 변수 설정

#### 백엔드 (.env)
```bash
cd backend
copy .env.example .env
```

`backend/.env` 파일 내용:
```env
# Supabase 설정
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-service-role-key
SUPABASE_DB_HOST=db.your-project-id.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-password

# API 설정
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:3000
```

#### 프론트엔드 (.env)
```bash
cd frontend
copy .env.example .env
```

`frontend/.env` 파일 내용:
```env
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_R_API_URL=http://localhost:8000
```

---

### 2단계: 의존성 설치

#### R 패키지 설치
```r
# R 콘솔에서 실행
install.packages(c(
  "plumber",      # REST API
  "TAM",          # MFRM 분석
  "RPostgreSQL",  # DB 연결
  "jsonlite",     # JSON 처리
  "dplyr",        # 데이터 조작
  "tidyr",        # 데이터 정리
  "dotenv"        # 환경변수
))
```

또는 터미널에서:
```bash
Rscript -e "install.packages(c('plumber', 'TAM', 'RPostgreSQL', 'jsonlite', 'dplyr', 'tidyr', 'dotenv'))"
```

#### Node.js 패키지 설치
```bash
cd frontend
npm install
```

---

### 3단계: 데이터베이스 설정

Supabase SQL Editor에서 실행:
```sql
-- database/schema.sql 파일 내용 실행
```

---

## 🧪 실행 확인

### 백엔드 테스트

**올바른 엔드포인트 사용:**

```bash
# 루트 경로 (기본 정보)
curl http://localhost:8000/

# 헬스 체크
curl http://localhost:8000/health

# API 정보
curl http://localhost:8000/api/info
```

**브라우저에서 직접 접속:**
- http://localhost:8000/ (루트 - API 정보)
- http://localhost:8000/health (헬스 체크)
- http://localhost:8000/api/info (상세 정보)

**예상 응답:**

루트 경로 (`/`):
```json
{
  "service": "MFRM Rater Training API",
  "version": "1.0.0 (Blueprint v0.9)",
  "status": "running",
  "endpoints": { ... }
}
```

헬스 체크 (`/health`):
```json
{
  "status": "ok",
  "service": "MFRM API",
  "version": "1.0.0"
}
```

> ⚠️ **주의**: 루트 경로(`http://localhost:8000`)만 접속하면 404 에러가 발생할 수 있습니다. `/health` 또는 `/api/info` 엔드포인트를 사용하세요.

### 프론트엔드 테스트
브라우저에서 http://localhost:3000 접속

**테스트 계정:**
| 역할 | 이메일 |
|-----|-------|
| 교사 | teacher1@example.com |
| 관리자 | admin@example.com |

---

## 🐳 Docker로 실행 (선택사항)

### 백엔드만 Docker로 실행
```bash
cd backend
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

---

## 🚨 문제 해결

### PowerShell 스크립트 실행 오류

**오류**: `'start_api.bat' 용어가 cmdlet, 함수, 스크립트 파일 또는 실행할 수 있는 프로그램 이름으로 인식되지 않습니다`

**해결 방법:**

1. **PowerShell 스크립트 사용 (권장):**
   ```powershell
   cd backend
   .\start_api.ps1
   ```

2. **배치 파일 실행 시 `.\` 접두사 사용:**
   ```powershell
   cd backend
   .\start_api.bat
   ```

3. **PowerShell 실행 정책 오류인 경우:**
   ```powershell
   # 현재 사용자에게만 적용
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   
   # 또는 관리자 권한으로
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine
   ```

### 404 에러 (Resource Not Found)

**오류**: `{"error":"404 - Resource Not Found"}`

**원인:**
- 존재하지 않는 엔드포인트로 요청
- 루트 경로(`/`)에 직접 접속 (이제는 해결됨)

**해결 방법:**

1. **올바른 엔드포인트 사용:**
   ```bash
   # ✅ 올바른 방법
   curl http://localhost:8000/health
   curl http://localhost:8000/api/info
   curl http://localhost:8000/
   
   # ❌ 잘못된 방법 (존재하지 않는 경로)
   curl http://localhost:8000/api
   curl http://localhost:8000/test
   ```

2. **사용 가능한 엔드포인트 확인:**
   ```bash
   # 루트 경로에서 모든 엔드포인트 목록 확인
   curl http://localhost:8000/
   
   # 또는 API 정보 확인
   curl http://localhost:8000/api/info
   ```

3. **주요 엔드포인트:**
   - `GET /` - 루트 (API 정보)
   - `GET /health` - 헬스 체크
   - `GET /api/info` - API 상세 정보
   - `POST /api/mfrm/analyze` - MFRM 분석 실행
   - `GET /api/mfrm/results/{run_id}` - 분석 결과 조회
   - `GET /api/mfrm/runs` - 분석 실행 목록

### 포트 충돌 (이미 사용 중)

**PowerShell:**
```powershell
# 8000 포트 사용 중인 프로세스 확인
Get-NetTCPConnection -LocalPort 8000 | Select-Object LocalAddress, LocalPort, State, OwningProcess

# 프로세스 종료
Stop-Process -Id [PID번호] -Force
```

**CMD:**
```cmd
# 8000 포트 사용 중인 프로세스 확인
netstat -ano | findstr :8000

# 프로세스 종료
taskkill /PID [PID번호] /F
```

**3000 포트도 동일하게 처리**

### R 패키지 설치 실패

```bash
# Windows: RTools 설치 필요
# https://cran.r-project.org/bin/windows/Rtools/

# 바이너리로 설치
install.packages("TAM", type = "win.binary")
```

### npm install 실패

```bash
npm cache clean --force
rm -rf node_modules
rm package-lock.json
npm install
```

### 데이터베이스 연결 실패

1. Supabase Dashboard → Settings → Database 확인
2. `.env` 파일의 연결 정보가 정확한지 확인
3. 네트워크 연결 확인

---

## 📁 파일 구조

```
mfrm-project/
├── backend/
│   ├── fluber.R          # API 엔드포인트
│   ├── model.R           # MFRM 모델
│   ├── db.R              # DB 연동
│   ├── start_api.bat     # 실행 스크립트 (CMD)
│   └── start_api.ps1     # 실행 스크립트 (PowerShell)
│
├── frontend/
│   ├── src/              # React 소스 코드
│   ├── package.json      # 의존성 정의
│   ├── start_app.bat     # 실행 스크립트 (CMD)
│   └── start_app.ps1     # 실행 스크립트 (PowerShell)
│
└── database/
    └── schema.sql        # DB 스키마
```

---

## 📌 주요 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/` | 루트 - API 기본 정보 및 엔드포인트 목록 |
| GET | `/health` | 헬스 체크 - 서버 상태 확인 |
| GET | `/api/info` | API 상세 정보 |
| POST | `/api/mfrm/analyze` | MFRM 분석 실행 |
| GET | `/api/mfrm/results/:id` | 분석 결과 조회 |
| GET | `/api/mfrm/teacher/:id` | 교사별 이력 |
| GET | `/api/mfrm/runs` | 분석 실행 목록 |
| GET | `/api/mfrm/active-version` | 활성 버전 조회 |
| GET | `/api/stats/teachers` | 교사 통계 |
| GET | `/api/stats/essays` | 에세이 통계 |
| GET | `/api/stats/latest` | 최신 결과 |

> 💡 **팁**: 모든 엔드포인트 목록은 `GET /` 또는 `GET /api/info`로 확인할 수 있습니다.

---

## ✅ 실행 체크리스트

### 사전 준비
- [ ] Node.js 18+ 설치
- [ ] R 4.2+ 설치
- [ ] Supabase 프로젝트 생성
- [ ] database/schema.sql 실행

### 설정
- [ ] backend/.env 파일 생성 및 설정
- [ ] frontend/.env 파일 생성 및 설정
- [ ] R 패키지 설치
- [ ] npm install 완료

### 실행 확인
- [ ] 백엔드 http://localhost:8000/ → API 정보 표시
- [ ] 백엔드 http://localhost:8000/health → OK
- [ ] 백엔드 http://localhost:8000/api/info → 상세 정보 표시
- [ ] 프론트엔드 http://localhost:3000 → 로그인 페이지
- [ ] 로그인 성공
- [ ] 대시보드 정상 표시

---

**문제가 있으면 이슈를 등록해주세요!** 🙏

---

*Last Updated: 2025-12-08*

