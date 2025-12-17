# 🗄️ Supabase 설정 가이드

**Supabase 프로젝트 생성 및 데이터베이스 초기화**

---

## 📋 목차

1. [프로젝트 생성](#1-프로젝트-생성)
2. [데이터베이스 초기화](#2-데이터베이스-초기화)
3. [API 키 확인](#3-api-키-확인)
4. [환경 변수 설정](#4-환경-변수-설정)
5. [문제 해결](#5-문제-해결)

---

## 1. 프로젝트 생성

### 1단계: Supabase 접속
```
🔗 https://supabase.com
```

### 2단계: 로그인
- GitHub 계정으로 로그인
- 또는 이메일로 회원가입

### 3단계: 새 프로젝트 생성
1. **"New Project"** 또는 **"Create Project"** 클릭
2. **Organization 선택** (없으면 자동 생성)

### 4단계: 프로젝트 정보 입력
```
Name: mfrm-rater-training
Database Password: [안전한 비밀번호 생성 및 저장!]
Region: Northeast Asia (Seoul) 또는 가까운 리전
Pricing Plan: Free
```

⚠️ **중요**: Database Password를 반드시 안전한 곳에 저장하세요!

### 5단계: 프로젝트 생성
- **"Create new project"** 클릭
- ⏱️ 약 2분 대기 (데이터베이스 프로비저닝)

---

## 2. 데이터베이스 초기화

### 상황별 가이드

#### 🆕 **새 프로젝트 (깨끗한 상태)**

**Supabase Dashboard → SQL Editor:**

1. **"New query"** 클릭
2. `database/schema.sql` 파일 열기
3. **전체 내용 복사** (Ctrl+A → Ctrl+C)
4. SQL Editor에 **붙여넣기** (Ctrl+V)
5. **"RUN"** 또는 **"Run query"** 클릭
6. ✅ 성공 메시지 확인

**소요 시간**: 약 10초

---

#### 🔄 **이미 테이블이 존재하는 경우**

에러 메시지:
```
ERROR: 42P07: relation "idx_teachers_email" already exists
또는
ERROR: relation "teachers" already exists
```

**해결 방법**: 기존 테이블을 모두 삭제하고 다시 생성

**Step 1: 기존 데이터 삭제**

**Supabase Dashboard → SQL Editor → New query:**

```sql
-- 1. drop_all.sql 내용 복사 & 실행
```

또는 아래 SQL을 직접 실행:

```sql
-- 뷰 삭제
DROP VIEW IF EXISTS latest_mfrm_results CASCADE;
DROP VIEW IF EXISTS essay_statistics CASCADE;
DROP VIEW IF EXISTS teacher_statistics CASCADE;

-- 함수 삭제
DROP FUNCTION IF EXISTS get_teacher_severity(UUID) CASCADE;
DROP FUNCTION IF EXISTS increment_essays_rated() CASCADE;

-- 테이블 삭제
DROP TABLE IF EXISTS essay_difficulties CASCADE;
DROP TABLE IF EXISTS mfrm_results CASCADE;
DROP TABLE IF EXISTS mfrm_runs CASCADE;
DROP TABLE IF EXISTS scores CASCADE;
DROP TABLE IF EXISTS rubrics CASCADE;
DROP TABLE IF EXISTS essays CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
```

**Step 2: schema.sql 실행**

1. 새 쿼리 생성
2. `database/schema.sql` 내용 복사
3. 붙여넣기
4. "RUN" 클릭

---

### 실행 결과 확인

**성공 시:**
```
Success. No rows returned
```

또는
```
✅ 샘플 데이터 입력 완료! as status
```

**테이블 확인:**
- **Database → Tables** 메뉴에서 8개 테이블 확인:
  - admins
  - teachers
  - essays
  - rubrics
  - scores
  - mfrm_runs
  - mfrm_results
  - essay_difficulties

---

## 3. API 키 확인

### Settings → API 메뉴

다음 정보를 복사하여 저장:

```bash
# 1. Project URL
Project URL: https://xxxxx.supabase.co

# 2. API Keys
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **보안 주의**:
- `anon public`: 프론트엔드에서 사용 (공개 가능)
- `service_role`: 백엔드에서만 사용 (절대 비밀!)

### Settings → Database 메뉴

데이터베이스 연결 정보 확인:

```bash
Host: db.xxxxx.supabase.co
Port: 5432
Database name: postgres
User: postgres
Password: [프로젝트 생성 시 입력한 비밀번호]
```

---

## 4. 환경 변수 설정

### backend/.env 업데이트

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# Supabase Database Connection
SUPABASE_DB_HOST=db.xxxxx.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your_database_password

# API Configuration
API_PORT=8000
API_HOST=0.0.0.0
ALLOWED_ORIGINS=http://localhost:3000
LOG_LEVEL=INFO
```

### frontend/.env 업데이트

```bash
# Supabase Configuration
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here

# R Backend API URL
REACT_APP_R_API_URL=http://localhost:8000

# Application Info
REACT_APP_NAME=MFRM 쓰기 평가 문식성 시스템
REACT_APP_VERSION=1.0.0
```

---

## 5. 문제 해결

### ❌ "relation already exists" 에러

**원인**: 이미 테이블이나 인덱스가 존재

**해결**: [🔄 이미 테이블이 존재하는 경우](#-이미-테이블이-존재하는-경우) 참고

### ❌ "insufficient privilege" 에러

**원인**: 권한 부족 (거의 발생하지 않음)

**해결**:
1. Supabase Dashboard에서 로그아웃
2. 다시 로그인
3. 프로젝트 Owner인지 확인

### ❌ "syntax error" 에러

**원인**: SQL 내용이 잘못 복사됨

**해결**:
1. `database/schema.sql` 파일을 다시 열기
2. **Ctrl+A** (전체 선택)
3. **Ctrl+C** (복사)
4. SQL Editor에서 **Ctrl+A** → **Ctrl+V** (모두 선택 후 붙여넣기)
5. "RUN" 클릭

### ⚠️ RLS 정책 에러

**원인**: Row Level Security 정책 충돌

**해결**:
```sql
-- 모든 RLS 정책 삭제
DROP POLICY IF EXISTS "Teachers can view their own data" ON teachers;
DROP POLICY IF EXISTS "Admins can view all teachers" ON teachers;
-- (다른 정책들도 동일하게)

-- 그 후 schema.sql 재실행
```

---

## 6. 데이터 확인

### SQL Editor에서 확인:

```sql
-- 1. 테이블 목록
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 2. 루브릭 확인 (9개)
SELECT id, name, max_score 
FROM rubrics 
ORDER BY id;

-- 3. 교사 확인 (3명)
SELECT id, name, email, essays_rated_count, diagnosis_level 
FROM teachers;

-- 4. 에세이 확인 (샘플 3개)
SELECT id, title, is_anchor, is_calibration 
FROM essays;
```

**기대 결과**:
- 루브릭: 9개
- 교사: 3명
- 에세이: 3개

---

## ✅ 설정 완료 체크리스트

### Supabase
- [ ] 프로젝트 생성 완료
- [ ] `drop_all.sql` 실행 (필요 시)
- [ ] `schema.sql` 실행 완료
- [ ] 8개 테이블 생성 확인
- [ ] 샘플 데이터 확인 (9개 루브릭)

### API 키
- [ ] Project URL 복사
- [ ] anon public key 복사
- [ ] service_role key 복사

### 데이터베이스 연결 정보
- [ ] DB Host 복사
- [ ] DB Password 확인

### 환경 변수
- [ ] `backend/.env` 업데이트
- [ ] `frontend/.env` 업데이트

---

## 🚀 다음 단계

Supabase 설정이 완료되었다면:

```powershell
# 터미널 1: 백엔드 실행
cd backend
$env:Path += ";C:\Program Files\R\R-4.2.3\bin\x64"
Rscript -e "pr <- plumber::plumb('fluber.R'); pr$run(host='0.0.0.0', port=8000)"

# 터미널 2: 프론트엔드 실행
cd frontend
npm start

# 브라우저
http://localhost:3000
```

---

## 📚 참고 문서

- **ENV_SETUP.md** - 환경 변수 상세 설정
- **RUN_LOCAL.md** - 로컬 실행 가이드
- **CHECK_STATUS.md** - 설치 상태 확인
- **QUICK_START.md** - 빠른 시작

---

**Supabase 설정 완료!** 🎉  
**이제 로컬에서 실행할 준비가 되었습니다!** 🚀

