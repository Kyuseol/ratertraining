# MFRM 쓰기 평가 문식성 시스템

교사의 쓰기 평가 문식성 진단 및 학습을 위한 웹 기반 시스템입니다. MFRM(Many-Facets Rasch Model) 통계 모델을 사용하여 평가자의 엄격성, 일관성, 헤일로 효과 등을 분석하고 개인화된 피드백을 제공합니다.

**Blueprint v0.9 기반** - 9개 평가요소, 3점 척도, 앵커 에세이 시스템

---

## 주요 특징

### 📊 고정척도(Master Scale) 기반 상시 참여형 시스템
- **앵커 에세이 시스템**: 12-16편의 앵커 에세이로 신규 교사 빠른 온보딩
- **캘리브레이션 세트**: 24-32편의 에세이로 초기 고정척도 구축
- **배치 재추정**: 주 1회 자동 재추정 및 품질 관리

### 🎯 9개 평가요소, 3점 척도
1. 주장의 명료성
2. 근거의 타당성
3. 예시의 적절성
4. 논리적 전개
5. 반론 고려
6. 어휘 사용
7. 문법 정확성
8. 글의 구조
9. 전체적 완성도

### 📈 개인별 진단 단계
- **예비 진단**: 6편 채점 (SE ≈ 0.40-0.50)
- **공식 진단**: 9편 채점 (SE ≈ 0.30-0.35)
- **정밀 추적**: 18편 채점 (SE ≈ 0.22-0.27)

### 🔍 상세 분석 지표
- **엄격성(Severity)**: 채점 기준의 엄격함/관대함 측정
- **일관성(Infit/Outfit)**: 채점 패턴의 일관성 분석
- **헤일로 효과**: 평가요소 간 과도한 상관 탐지
- **범주 불균형**: 특정 점수의 과다 사용 분석
- **반응시간 이상치**: 비정상적으로 빠른/느린 채점 감지

---

## 기술 스택

### Frontend
- React 18 + TypeScript 5
- Supabase (실시간 데이터베이스)
- Netlify (호스팅)

### Backend
- R 4.3+ (MFRM 분석)
- Plumber (REST API)
- TAM (Many-Facets Rasch Model)
- Oracle Cloud Always Free (컴퓨팅)

### Database
- Supabase PostgreSQL
- Row Level Security (RLS)
- 실시간 구독 지원

---

## 프로젝트 구조

```
mfrm-project/
├── backend/                # R 백엔드
│   ├── model.R            # MFRM 모델 구현
│   ├── fluber.R           # Plumber API
│   ├── db.R               # 데이터베이스 연동
│   └── Dockerfile         # 컨테이너 설정
│
├── frontend/              # React 프론트엔드
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/    # 관리자 모드
│   │   │   └── teacher/  # 교사 모드
│   │   ├── pages/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── EssayManagement.tsx
│   │   │   ├── AnchorManagement.tsx
│   │   │   └── TeacherDashboard.tsx
│   │   └── types/        # TypeScript 타입
│   └── package.json
│
├── database/
│   └── schema.sql         # 데이터베이스 스키마
│
├── docs/                  # 문서
│   ├── ORACLE_SETUP.md
│   └── SUPABASE_SETUP.md
│
├── blueprint.md           # Blueprint v0.9 설계 문서
└── CLAUDE.md              # 프로젝트 컨텍스트
```

---

## 빠른 시작

### 사전 요구사항
- Node.js 18+
- R 4.3+
- Supabase 계정
- Oracle Cloud 계정 (선택사항)

### 1. 데이터베이스 설정

```bash
# Supabase에서 새 프로젝트 생성 후
# SQL Editor에서 database/schema.sql 실행
```

### 2. 환경 변수 설정

**Frontend (.env)**
```bash
REACT_APP_SUPABASE_URL=https://xxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJxxx...
REACT_APP_R_API_URL=http://localhost:8000
```

**Backend (.env)**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJxxx...
SUPABASE_DB_HOST=db.xxx.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=xxx
```

### 3. 로컬 개발 환경 실행

**백엔드**
```bash
cd backend
Rscript -e "install.packages(c('plumber', 'TAM', 'RPostgreSQL', 'jsonlite', 'dplyr', 'tidyr'))"
Rscript -e "pr <- plumber::plumb('fluber.R'); pr$run(host='0.0.0.0', port=8000)"
```

**프론트엔드**
```bash
cd frontend
npm install
npm start  # http://localhost:3000
```

---

## 관리자 모드 (Admin Mode)

### 에세이 관리
- 새 에세이 추가
- 앵커 에세이 설정 (경계 근거 주해 작성)
- 캘리브레이션 세트 구성
- 난이도 수준 설정 (저/중/고)

### 앵커 에세이 관리
- 앵커 포트폴리오 점검
- 범주 경계 커버리지 매트릭스
- 9개 평가요소별 1↔2, 2↔3 경계 사례 확인

### 대시보드
- Blueprint 구성 상태 모니터링
- 시스템 통계 (교사, 에세이, 채점 수)
- 품질 지표 추적

---

## Blueprint v0.9 핵심 개념

### 앵커 혼입률
- **신규 교사**: 25% 앵커 에세이 혼입
- **유지 단계**: 15-20% 앵커 에세이 혼입
- **이중 채점**: 30-40% (무작위 + 위험기반 샘플링)

### 배치 재추정 수용 기준
- **인핏/아웃핏 중앙값**: 0.7-1.3
- **분리지수**: ≥ 1.5
- **극단 응답률**: ≤ 10%
- **요소별 문턱 순서**: 정상

### 캘리브레이션 공식
```
N_cal = ⌈120 / R_panel⌉

R_panel: 패널 채점자 수
120: 요소당 필요한 최소 관측치 수
```

---

## 배포

### Netlify (Frontend)
```bash
cd frontend
npm run build
# Netlify Dashboard에서 GitHub 저장소 연결
```

### Oracle Cloud (Backend)
```bash
# VM 인스턴스에서
cd ~/mfrm-backend
docker-compose up -d
```

자세한 배포 가이드는 `docs/` 폴더를 참조하세요.

---

## 문서

- **`CLAUDE.md`**: 프로젝트 전체 컨텍스트, 기술 스택, 코딩 가이드
- **`blueprint.md`**: Blueprint v0.9 측정·운영 설계 문서
- **`docs/ORACLE_SETUP.md`**: Oracle Cloud 설정 가이드
- **`docs/SUPABASE_SETUP.md`**: Supabase 설정 가이드

---

## 라이선스

MIT License

---

## 문의

프로젝트 관련 문의사항은 이슈를 등록해주세요.

---

**Last Updated**: 2025-11-16
**Version**: 1.0.0 (Blueprint v0.9)
