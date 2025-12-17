# 📝 Step 1: 환경 변수 설정 가이드

**Supabase API 키를 .env 파일에 입력하기**

---

## 🎯 목표

Supabase에서 복사한 API 키를 `backend/.env`와 `frontend/.env` 파일에 입력합니다.

---

## 📋 Part 1: Supabase API 키 복사

### 1. Supabase Dashboard 접속

```
https://supabase.com/dashboard
```

프로젝트 선택: **mfrm-rater-training**

---

### 2. Settings → API 메뉴

**왼쪽 사이드바:**
```
⚙️ Settings  ← 클릭
   └─ 🔑 API  ← 클릭
```

**복사할 정보 (3개):**

#### 📌 Project URL
```
찾는 위치: "Configuration" 섹션 → "URL"
예시: https://abcdefghijk.supabase.co

📋 복사하기 → 메모장에 붙여넣기
```

#### 📌 anon public key
```
찾는 위치: "Project API keys" 섹션 → "anon public"
예시: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhY...

📋 복사하기 → 메모장에 붙여넣기
```

#### 📌 service_role key
```
찾는 위치: "Project API keys" 섹션 → "service_role" (⚠️ Secret!)
예시: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhY...

📋 복사하기 → 메모장에 붙여넣기
⚠️ 이 키는 절대 공개하면 안 됩니다!
```

---

### 3. Settings → Database 메뉴

**왼쪽 사이드바:**
```
⚙️ Settings
   └─ 🗄️ Database  ← 클릭
```

**Connection Info 섹션에서 복사:**

#### 📌 Host
```
찾는 위치: "Connection string" → "Host"
예시: db.abcdefghijk.supabase.co

📋 복사하기 → 메모장에 붙여넣기
```

#### 📌 Database Password
```
⚠️ 프로젝트 생성 시 입력한 비밀번호
만약 잊어버렸다면: "Database password" 섹션에서 "Reset Database Password" 클릭
```

---

## 🔧 Part 2: backend/.env 파일 업데이트

### 1. 파일 열기

**VS Code에서:**
```
backend/.env 파일 열기
```

또는

**메모장에서:**
```powershell
notepad backend/.env
```

---

### 2. 내용 수정

**기존 내용을 모두 삭제하고 아래 내용으로 교체:**

```bash
# MFRM Backend Environment Variables

# Supabase Configuration
SUPABASE_URL=https://abcdefghijk.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service_role_키_여기
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon_키_여기

# Supabase Database Connection
SUPABASE_DB_HOST=db.abcdefghijk.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your_database_password

# API Configuration
API_PORT=8000
API_HOST=0.0.0.0

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000

# Logging
LOG_LEVEL=INFO

# TAM Model Configuration
TAM_MAX_ITER=1000
TAM_CONV_D=0.001
```

---

### 3. 실제 값으로 교체

**⚠️ 중요: 아래 값들을 Supabase에서 복사한 실제 값으로 변경하세요!**

```bash
SUPABASE_URL=https://your-project.supabase.co
         ↓
SUPABASE_URL=https://abcdefghijk.supabase.co  ← 실제 Project URL

SUPABASE_KEY=eyJ...service_role_키
         ↓
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.실제service_role키

SUPABASE_ANON_KEY=eyJ...anon_키
         ↓
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.실제anon키

SUPABASE_DB_HOST=db.your-project.supabase.co
         ↓
SUPABASE_DB_HOST=db.abcdefghijk.supabase.co  ← 실제 Host

SUPABASE_DB_PASSWORD=your_database_password
         ↓
SUPABASE_DB_PASSWORD=MySecurePassword123!  ← 실제 비밀번호
```

---

### 4. 저장

- **VS Code**: `Ctrl + S`
- **메모장**: `파일 → 저장`

---

## 🎨 Part 3: frontend/.env 파일 업데이트

### 1. 파일 열기

**VS Code에서:**
```
frontend/.env 파일 열기
```

또는

**메모장에서:**
```powershell
notepad frontend/.env
```

---

### 2. 내용 수정

**기존 내용을 모두 삭제하고 아래 내용으로 교체:**

```bash
# MFRM Frontend Environment Variables

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://abcdefghijk.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon_키_여기

# R Backend API URL
# Local development:
REACT_APP_R_API_URL=http://localhost:8000

# Production (배포 후 업데이트):
# REACT_APP_R_API_URL=https://your-backend-url:8000

# Application Info
REACT_APP_NAME=MFRM 쓰기 평가 문식성 시스템
REACT_APP_VERSION=1.0.0
```

---

### 3. 실제 값으로 교체

**⚠️ 중요: 백엔드와 동일한 Supabase 정보 입력!**

```bash
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
         ↓
REACT_APP_SUPABASE_URL=https://abcdefghijk.supabase.co  ← backend/.env와 동일

REACT_APP_SUPABASE_ANON_KEY=eyJ...anon_키
         ↓
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.실제anon키
                             ↑ backend/.env의 SUPABASE_ANON_KEY와 동일!
```

**⚠️ 주의**: 
- 프론트엔드에는 `service_role` 키를 **절대 넣지 마세요!**
- `anon` 키만 사용합니다

---

### 4. 저장

- **VS Code**: `Ctrl + S`
- **메모장**: `파일 → 저장`

---

## ✅ Part 4: 설정 확인

### 체크리스트

- [ ] **backend/.env** 파일 수정 완료
  - [ ] SUPABASE_URL (https://...)
  - [ ] SUPABASE_KEY (service_role 키)
  - [ ] SUPABASE_ANON_KEY (anon 키)
  - [ ] SUPABASE_DB_HOST (db....)
  - [ ] SUPABASE_DB_PASSWORD (실제 비밀번호)

- [ ] **frontend/.env** 파일 수정 완료
  - [ ] REACT_APP_SUPABASE_URL (backend와 동일)
  - [ ] REACT_APP_SUPABASE_ANON_KEY (backend의 SUPABASE_ANON_KEY와 동일)
  - [ ] REACT_APP_R_API_URL (http://localhost:8000)

---

## 🔍 설정 값 확인 방법

### PowerShell에서 확인:

```powershell
# 백엔드 환경 변수 로드 테스트
cd backend
Get-Content .env | Select-String -Pattern "SUPABASE_URL"

# 프론트엔드 환경 변수 확인
cd ../frontend
Get-Content .env | Select-String -Pattern "REACT_APP_SUPABASE_URL"
```

**예상 출력:**
```
SUPABASE_URL=https://abcdefghijk.supabase.co
REACT_APP_SUPABASE_URL=https://abcdefghijk.supabase.co
```

두 값이 동일해야 합니다!

---

## ⚠️ 보안 주의사항

### ✅ 해야 할 것
- `.env` 파일은 `.gitignore`에 포함되어 있음 (이미 설정됨)
- `service_role` 키는 백엔드에만 사용
- `anon` 키는 프론트엔드에서 사용

### ❌ 하지 말아야 할 것
- `.env` 파일을 Git에 커밋하지 마세요
- `service_role` 키를 프론트엔드에 넣지 마세요
- API 키를 코드에 직접 입력하지 마세요
- API 키를 공개 저장소에 올리지 마세요

---

## 🎯 완료 후

환경 변수 설정이 완료되면:

### 다음 단계: 로컬 실행 테스트

```powershell
# 터미널 1: 백엔드
cd backend
$env:Path += ";C:\Program Files\R\R-4.2.3\bin\x64"
Rscript -e "pr <- plumber::plumb('fluber.R'); pr$run(host='0.0.0.0', port=8000)"

# 터미널 2: 프론트엔드
cd frontend
npm start
```

---

## 🐛 문제 해결

### 문제 1: .env 파일이 없어요

```powershell
# backend/.env 생성
cd backend
New-Item .env -ItemType File

# frontend/.env 생성
cd ../frontend
New-Item .env -ItemType File
```

### 문제 2: Supabase 비밀번호를 잊어버렸어요

**Supabase Dashboard:**
1. Settings → Database
2. "Database password" 섹션
3. "Reset Database Password" 클릭
4. 새 비밀번호 생성
5. `.env` 파일에 입력

### 문제 3: API 키가 보이지 않아요

**Supabase Dashboard:**
1. Settings → API
2. "Reveal" 버튼 클릭 (service_role 키)
3. 복사

---

## 📚 참고 문서

- **ENV_SETUP.md** - 환경 변수 상세 가이드
- **SUPABASE_SETUP.md** - Supabase 설정 전체 가이드
- **RUN_LOCAL.md** - 로컬 실행 가이드

---

**환경 변수 설정 완료!** ✅  
**다음: 로컬 실행 테스트** 🚀

