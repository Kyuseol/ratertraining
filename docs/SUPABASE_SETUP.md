# Supabase 설정 가이드

이 문서는 MFRM 프로젝트를 위한 Supabase 설정 전체 과정을 단계별로 설명합니다.

---

## 📋 목차

1. [계정 생성 및 프로젝트 생성](#1-계정-생성-및-프로젝트-생성)
2. [데이터베이스 스키마 적용](#2-데이터베이스-스키마-적용)
3. [연결 정보 확인](#3-연결-정보-확인)
4. [Row Level Security 설정](#4-row-level-security-설정)
5. [테스트 데이터 확인](#5-테스트-데이터-확인)
6. [문제 해결](#6-문제-해결)

---

## 1. 계정 생성 및 프로젝트 생성

### 1.1 Supabase 가입

1. **웹사이트 방문**
   - https://supabase.com 접속

2. **계정 생성**
   - "Start your project" 클릭
   - **GitHub 계정으로 로그인 권장** (자동 연동)
   - 또는 이메일로 가입 가능

3. **이메일 인증**
   - 가입 시 받은 이메일 확인
   - 인증 링크 클릭

---

### 1.2 새 프로젝트 생성

1. **Dashboard 접속**
   - 로그인 후 대시보드로 이동
   - "New Project" 버튼 클릭

2. **Organization 선택**
   - 개인 계정 또는 팀 선택
   - 무료 플랜으로 시작

3. **프로젝트 정보 입력**

```
Name: mfrm-rater-training
Database Password: [안전한 비밀번호 생성]
  ⚠️ 반드시 안전한 곳에 저장! (비밀번호 분실 시 복구 불가)
  예: MfRm$2025!Secure#Pass
  
Region: Northeast Asia (Seoul)
  또는 Southeast Asia (Singapore)
  (가장 가까운 리전 선택)
  
Pricing Plan: Free
```

4. **프로젝트 생성**
   - "Create new project" 클릭
   - ⏱️ 약 2분 소요 (프로비저닝 진행)

---

## 2. 데이터베이스 스키마 적용

### 2.1 SQL Editor 접근

1. 왼쪽 메뉴에서 **"SQL Editor"** 클릭
2. "New query" 클릭

### 2.2 스키마 적용

1. **파일 열기**
   - 로컬 프로젝트에서 `database/schema.sql` 파일 열기

2. **내용 복사**
   - 전체 내용 복사 (Ctrl+A → Ctrl+C)

3. **SQL Editor에 붙여넣기**
   - Supabase SQL Editor에 붙여넣기 (Ctrl+V)

4. **실행**
   - 우측 하단 "RUN" 버튼 클릭 (또는 Ctrl+Enter)

5. **성공 확인**
   ```
   Success. No rows returned
   NOTICE: MFRM Database Schema Created Successfully!
   NOTICE: Tables: teachers, essays, rubrics, scores...
   NOTICE: Sample data inserted for testing.
   ```

### 2.3 테이블 확인

1. 왼쪽 메뉴에서 **"Table Editor"** 클릭
2. 생성된 테이블 목록 확인:
   - ✅ teachers
   - ✅ essays
   - ✅ rubrics
   - ✅ scores
   - ✅ mfrm_runs
   - ✅ mfrm_results
   - ✅ essay_difficulties

---

## 3. 연결 정보 확인

### 3.1 API 키 확인

1. **Settings → API 메뉴**
   - 왼쪽 하단 톱니바퀴 아이콘 → "API"

2. **중요 정보 복사**

```bash
# Project URL
URL: https://[your-project-id].supabase.co

# API Keys
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  → 프론트엔드에서 사용 (공개 가능)
  
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  → 백엔드에서만 사용 (절대 공개 금지!)
```

3. **안전하게 저장**
   - 비밀번호 관리 프로그램 사용 권장
   - 또는 로컬 `.env` 파일에 저장 (Git 제외)

---

### 3.2 데이터베이스 연결 정보

1. **Settings → Database 메뉴**

2. **Connection string 확인**

```bash
Host: db.[your-project-id].supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [프로젝트 생성 시 입력한 비밀번호]
```

3. **Connection String (PostgreSQL URI)**
```
postgresql://postgres:[YOUR-PASSWORD]@db.[your-project-id].supabase.co:5432/postgres
```

---

## 4. Row Level Security 설정

### 4.1 현재 RLS 상태 확인

스키마 적용 시 기본 RLS가 설정되었습니다:
- ✅ 모든 테이블에 RLS 활성화
- ✅ 읽기: 모든 사용자 허용
- ✅ 쓰기: 제한적 허용 (개발 중)

### 4.2 프로덕션 RLS 강화 (선택사항)

실제 운영 시에는 더 엄격한 정책이 필요합니다:

```sql
-- 교사는 자신의 점수만 수정 가능
CREATE POLICY "Teachers can update own scores" ON scores
    FOR UPDATE USING (
        auth.uid()::text = teacher_id::text
    );

-- 관리자만 MFRM 분석 실행 가능
CREATE POLICY "Only admins can create runs" ON mfrm_runs
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'admin'
    );

-- 교사는 자신의 분석 결과만 조회
CREATE POLICY "Teachers can view own results" ON mfrm_results
    FOR SELECT USING (
        auth.uid()::text = teacher_id::text
        OR auth.jwt() ->> 'role' = 'admin'
    );
```

---

## 5. 테스트 데이터 확인

### 5.1 샘플 데이터 조회

SQL Editor에서 다음 쿼리 실행:

```sql
-- 교사 목록
SELECT * FROM teachers;

-- 루브릭 목록
SELECT * FROM rubrics;

-- 에세이 목록
SELECT * FROM essays;

-- 채점 데이터
SELECT * FROM scores;
```

### 5.2 View 테스트

```sql
-- 교사별 통계
SELECT * FROM teacher_statistics;

-- 에세이별 통계
SELECT * FROM essay_statistics;
```

---

## 6. 환경 변수 설정

### 6.1 백엔드 환경 변수

`backend/.env` 파일 생성:

```bash
# Supabase
SUPABASE_URL=https://[your-project-id].supabase.co
SUPABASE_KEY=[your-service-role-key]
SUPABASE_DB_HOST=db.[your-project-id].supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=[your-database-password]

# API
API_PORT=8000
API_HOST=0.0.0.0
```

### 6.2 프론트엔드 환경 변수

`frontend/.env` 파일 생성:

```bash
REACT_APP_SUPABASE_URL=https://[your-project-id].supabase.co
REACT_APP_SUPABASE_ANON_KEY=[your-anon-key]
REACT_APP_R_API_URL=http://localhost:8000
```

---

## 7. 문제 해결

### 7.1 스키마 적용 실패

**증상:** SQL 실행 시 에러 발생

**해결 방법:**
1. 기존 테이블 확인:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   ```

2. 테이블이 이미 존재하면 삭제 후 재생성:
   ```sql
   DROP TABLE IF EXISTS essay_difficulties CASCADE;
   DROP TABLE IF EXISTS mfrm_results CASCADE;
   DROP TABLE IF EXISTS mfrm_runs CASCADE;
   DROP TABLE IF EXISTS scores CASCADE;
   DROP TABLE IF EXISTS rubrics CASCADE;
   DROP TABLE IF EXISTS essays CASCADE;
   DROP TABLE IF EXISTS teachers CASCADE;
   ```

3. 다시 `schema.sql` 실행

---

### 7.2 연결 테스트

**PostgreSQL 클라이언트로 연결 확인:**

```bash
psql "postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres"
```

**성공 시:**
```
postgres=>
```

---

### 7.3 API 키 작동 확인

**cURL로 테스트:**

```bash
curl "https://[your-project-id].supabase.co/rest/v1/teachers" \
  -H "apikey: [your-anon-key]" \
  -H "Authorization: Bearer [your-anon-key]"
```

**성공 시:** JSON 배열 반환

---

## 8. 다음 단계

✅ Supabase 설정 완료!

**다음 작업:**
1. R 백엔드 개발 (Supabase 연동)
2. 프론트엔드 개발 (Supabase 클라이언트)
3. Oracle Cloud VM 배포

---

## 📚 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**마지막 업데이트:** 2025-11-15
**문서 버전:** 1.0

