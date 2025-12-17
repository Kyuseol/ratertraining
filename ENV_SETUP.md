# 🔐 환경 변수 설정 가이드

**`.env` 파일 생성 및 설정**

---

## 📋 백엔드 환경 변수 (`backend/.env`)

### 파일 생성
```bash
cd backend
# 새 파일 생성: .env
```

### 파일 내용
```bash
# MFRM Backend Environment Variables

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# Supabase Database Connection
SUPABASE_DB_HOST=db.your-project.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your_database_password

# API Configuration
API_PORT=8000
API_HOST=0.0.0.0

# CORS Configuration (comma-separated origins)
ALLOWED_ORIGINS=http://localhost:3000,https://your-app.netlify.app

# Logging
LOG_LEVEL=INFO

# TAM Model Configuration
TAM_MAX_ITER=1000
TAM_CONV_D=0.001
```

### 실제 값으로 변경
1. **Supabase Dashboard** → Settings → API
   ```
   SUPABASE_URL: Project URL 복사
   SUPABASE_ANON_KEY: anon public 키 복사
   SUPABASE_KEY: service_role 키 복사 (⚠️ 절대 비밀!)
   ```

2. **Supabase Dashboard** → Settings → Database
   ```
   SUPABASE_DB_HOST: Host 복사 (db.xxxxx.supabase.co)
   SUPABASE_DB_PASSWORD: 프로젝트 생성 시 설정한 비밀번호
   ```

---

## 📋 프론트엔드 환경 변수 (`frontend/.env`)

### 파일 생성
```bash
cd frontend
# 새 파일 생성: .env
```

### 파일 내용
```bash
# MFRM Frontend Environment Variables

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here

# R Backend API URL
# Local development:
REACT_APP_R_API_URL=http://localhost:8000

# Production (update after deploying to Oracle Cloud):
# REACT_APP_R_API_URL=https://your-oracle-vm-ip:8000

# Optional: Application Configuration
REACT_APP_NAME=MFRM 쓰기 평가 문식성 시스템
REACT_APP_VERSION=1.0.0
```

### 실제 값으로 변경
1. **Supabase 정보 입력** (백엔드와 동일한 URL, anon key)
   ```
   REACT_APP_SUPABASE_URL: 백엔드의 SUPABASE_URL과 동일
   REACT_APP_SUPABASE_ANON_KEY: 백엔드의 SUPABASE_ANON_KEY와 동일
   ```

2. **API URL 확인**
   - 로컬 개발: `http://localhost:8000`
   - 프로덕션: 백엔드 서버 주소로 변경

---

## ⚠️ 중요 보안 사항

### ✅ 반드시 지킬 것
1. **`.env` 파일을 Git에 커밋하지 마세요!**
   - 이미 `.gitignore`에 포함되어 있습니다
   - `git status`로 확인하세요

2. **`service_role` 키는 백엔드에만 사용!**
   - 프론트엔드에는 `anon` 키만 사용
   - `service_role` 키는 모든 권한을 가지므로 유출 금지

3. **데이터베이스 비밀번호 안전하게 보관**
   - 비밀번호 관리자 사용 권장

### ❌ 절대 하지 말 것
```javascript
// ❌ 코드에 직접 키를 넣지 마세요!
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIs..."

// ✅ 환경 변수 사용
const SUPABASE_KEY = process.env.SUPABASE_KEY
```

---

## 🧪 설정 확인

### 백엔드 확인
```r
# R 콘솔에서
Sys.getenv("SUPABASE_URL")
# 출력: "https://xxxxx.supabase.co"

Sys.getenv("SUPABASE_DB_HOST")
# 출력: "db.xxxxx.supabase.co"
```

### 프론트엔드 확인
```bash
# 터미널에서 (Windows)
cd frontend
echo $env:REACT_APP_SUPABASE_URL

# 또는 npm start 후 브라우저 콘솔(F12)에서
console.log(process.env.REACT_APP_SUPABASE_URL)
```

---

## 📝 체크리스트

### 백엔드 `.env`
- [ ] 파일 생성: `backend/.env`
- [ ] SUPABASE_URL 입력
- [ ] SUPABASE_KEY (service_role) 입력
- [ ] SUPABASE_ANON_KEY 입력
- [ ] SUPABASE_DB_HOST 입력
- [ ] SUPABASE_DB_PASSWORD 입력
- [ ] 나머지는 기본값 유지

### 프론트엔드 `.env`
- [ ] 파일 생성: `frontend/.env`
- [ ] REACT_APP_SUPABASE_URL 입력 (백엔드와 동일)
- [ ] REACT_APP_SUPABASE_ANON_KEY 입력 (백엔드와 동일)
- [ ] REACT_APP_R_API_URL 확인 (로컬: localhost:8000)
- [ ] 나머지는 기본값 유지

### 보안
- [ ] `.gitignore`에 `.env` 포함 확인
- [ ] `git status`로 .env 파일 추적 안되는지 확인
- [ ] service_role 키는 백엔드만 사용 확인

---

## 🔄 배포 시 환경 변수

### Netlify (프론트엔드)
**Site settings → Build & deploy → Environment variables**
```
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...
REACT_APP_R_API_URL=https://your-backend-url
```

### Oracle Cloud / Docker (백엔드)
```bash
# docker-compose.yml에서 환경 변수 설정
# 또는 .env 파일을 서버에 업로드
```

---

## 📚 참고

- **Supabase 키 찾기**: https://supabase.com/dashboard → Project Settings → API
- **환경 변수 네이밍**: React에서는 `REACT_APP_` 접두사 필수
- **로컬 vs 프로덕션**: 서로 다른 `.env` 사용 (`.env.local`, `.env.production`)

---

**환경 변수 설정 완료 후 → RUN_LOCAL.md로 이동!** 🚀

