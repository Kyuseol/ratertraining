# Database Schema Documentation

MFRM Rater Training System의 Supabase PostgreSQL 데이터베이스 스키마 문서입니다.

## 📋 테이블 구조

### 1. **teachers** (교사 정보)
교사 계정 및 기본 정보를 저장합니다.

**주요 컬럼:**
- `id`: UUID, Primary Key
- `email`: 이메일 (UNIQUE)
- `name`: 교사 이름
- `institution`: 소속 기관
- `is_active`: 활성화 여부

**관계:**
- `scores` 테이블과 1:N 관계
- `mfrm_results` 테이블과 1:N 관계

---

### 2. **essays** (에세이)
채점 대상 에세이 정보를 저장합니다.

**주요 컬럼:**
- `id`: UUID, Primary Key
- `title`: 제목
- `content`: 본문
- `grade_level`: 학년 수준
- `word_count`: 단어 수

**관계:**
- `scores` 테이블과 1:N 관계
- `essay_difficulties` 테이블과 1:N 관계

---

### 3. **rubrics** (채점 기준)
채점 항목과 기준을 정의합니다.

**주요 컬럼:**
- `id`: UUID, Primary Key
- `name`: 항목명 (예: "내용", "구조", "문법")
- `description`: 설명
- `min_score`, `max_score`: 점수 범위
- `weight`: 가중치

**관계:**
- `scores` 테이블과 1:N 관계

---

### 4. **scores** (채점 데이터) ⭐ 핵심!
실제 채점 데이터를 저장합니다. **MFRM 분석의 핵심 데이터**입니다.

**주요 컬럼:**
- `teacher_id`: 교사 ID (FK)
- `essay_id`: 에세이 ID (FK)
- `rubric_id`: 루브릭 ID (FK)
- `score`: 점수
- `rating_duration_seconds`: 채점 소요 시간

**제약:**
- UNIQUE(teacher_id, essay_id, rubric_id): 중복 채점 방지

**관계:**
- `teachers`, `essays`, `rubrics`와 N:1 관계

---

### 5. **mfrm_runs** (MFRM 분석 실행 기록)
MFRM 분석 실행 정보와 상태를 추적합니다.

**주요 컬럼:**
- `id`: UUID, Primary Key
- `name`: 분석 이름
- `status`: 상태 (pending, running, completed, failed)
- `teacher_ids`, `essay_ids`, `rubric_ids`: 분석 대상 ID 배열
- `convergence`: 모델 수렴 여부

**관계:**
- `mfrm_results` 테이블과 1:N 관계

---

### 6. **mfrm_results** (MFRM 분석 결과)
교사별 MFRM 파라미터를 저장합니다.

**주요 컬럼:**
- `run_id`: 분석 실행 ID (FK)
- `teacher_id`: 교사 ID (FK)
- `severity`: **엄격성** (logit scale, 양수=엄격, 음수=관대)
- `infit`, `outfit`: **일관성 지표** (0.7-1.3 적정)
- `mean_score`: 평균 점수
- `total_ratings`: 채점 수

**관계:**
- `mfrm_runs`, `teachers`와 N:1 관계

---

### 7. **essay_difficulties** (에세이 난이도)
에세이별 난이도 파라미터를 저장합니다.

**주요 컬럼:**
- `run_id`: 분석 실행 ID (FK)
- `essay_id`: 에세이 ID (FK)
- `difficulty`: 난이도 (logit scale)

---

## 📊 ERD (Entity Relationship Diagram)

```
teachers (교사)
    ↓ 1:N
scores (채점) ←─ N:1 ─→ essays (에세이)
    ↓ N:1              ↓ 1:N
rubrics (기준)    essay_difficulties
                       ↓ N:1
    ↓ N:1             mfrm_runs (분석 실행)
mfrm_results          ↑ 1:N
    ↑ N:1 ────────────┘
```

---

## 🔐 Row Level Security (RLS)

### 현재 설정
- **읽기**: 모든 사용자 허용 (익명 포함)
- **쓰기**: 모든 사용자 허용 (임시)

### 프로덕션 권장 설정
```sql
-- 교사는 자신의 점수만 수정
CREATE POLICY "Teachers can update own scores" ON scores
    FOR UPDATE USING (auth.uid() = teacher_id);

-- 관리자만 분석 실행
CREATE POLICY "Only admins can create runs" ON mfrm_runs
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');
```

---

## 🎯 샘플 데이터

스키마 적용 시 자동으로 생성되는 샘플 데이터:

- **교사 3명**: teacher1@example.com, teacher2@example.com, teacher3@example.com
- **루브릭 5개**: 내용, 구조, 문법, 창의성, 전체적 인상
- **에세이 3개**: 고등학교 수준 샘플 에세이

---

## 📝 유용한 쿼리

### 1. 교사별 채점 현황 조회
```sql
SELECT * FROM teacher_statistics;
```

### 2. 에세이별 통계 조회
```sql
SELECT * FROM essay_statistics;
```

### 3. 최근 MFRM 분석 결과
```sql
SELECT * FROM latest_mfrm_results;
```

### 4. 특정 교사의 평균 엄격성
```sql
SELECT get_teacher_severity('11111111-1111-1111-1111-111111111111');
```

### 5. 채점 데이터 개수 확인 (MFRM 분석 가능 여부)
```sql
SELECT 
    COUNT(*) as total_scores,
    COUNT(DISTINCT teacher_id) as num_teachers,
    COUNT(DISTINCT essay_id) as num_essays
FROM scores;
-- MFRM 분석 최소 요구: 30개 이상의 점수, 3명 이상의 교사
```

---

## 🚀 스키마 적용 방법

### 방법 1: Supabase Dashboard (권장)
1. Supabase Dashboard 로그인
2. SQL Editor 메뉴 클릭
3. `schema.sql` 내용 붙여넣기
4. "RUN" 클릭

### 방법 2: Supabase CLI
```bash
supabase db push
```

### 방법 3: PostgreSQL 직접 연결
```bash
psql "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres" -f schema.sql
```

---

## 🔄 마이그레이션

스키마 변경 시:
1. `schema.sql` 수정
2. 변경 사항을 별도 마이그레이션 파일로 작성 (예: `001_add_column.sql`)
3. Supabase SQL Editor에서 실행

---

## 📚 참고 자료

- [Supabase 문서](https://supabase.com/docs)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)
- [TAM 패키지 가이드](https://cran.r-project.org/web/packages/TAM/TAM.pdf)

---

**마지막 업데이트:** 2025-11-15

