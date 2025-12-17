# 🚀 MFRM 프로젝트 구현 계획
## Oracle Cloud + Supabase + Netlify 아키텍처

---

## 📋 목차
1. [전체 아키텍처](#전체-아키텍처)
2. [단계별 구현 계획](#단계별-구현-계획)
3. [예상 소요 시간](#예상-소요-시간)
4. [최종 예상 비용](#최종-예상-비용)

---

## 🏗️ 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                     교사 (브라우저)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │  Netlify (프론트엔드)   │
         │  - React + TypeScript  │
         │  - 채점 인터페이스      │
         └───────┬───────────────┘
                 │
                 ├─────────────────────┐
                 ↓                     ↓
    ┌────────────────────┐   ┌─────────────────────┐
    │  Supabase (DB)     │   │  Oracle Cloud       │
    │  - PostgreSQL      │←──│  - R + Plumber API  │
    │  - 채점 데이터 저장 │   │  - TAM (MFRM 계산)  │
    │  - 파라미터 저장    │   │  - Docker 컨테이너   │
    └────────────────────┘   └─────────────────────┘
```

### 데이터 흐름

**1. 채점 단계**
```
교사 채점 입력 → Netlify 앱 → Supabase DB (scores 테이블에 INSERT)
```

**2. 분석 단계**
```
"분석 실행" 버튼 클릭
  → Netlify 앱 → Oracle R API 호출
  → R API가 Supabase DB에서 데이터 조회
  → TAM 패키지로 MFRM 계산
  → 결과를 Supabase DB (parameters 테이블)에 저장
  → 프론트엔드에 완료 응답
```

**3. 결과 확인**
```
Netlify 앱 → Supabase DB에서 parameters 조회 → 화면에 표시
```

---

## 📅 단계별 구현 계획

### **Phase 1: 데이터베이스 구축 (2-3시간)**

#### 1.1 Supabase 프로젝트 생성
- [ ] Supabase 계정 생성 (https://supabase.com)
- [ ] 새 프로젝트 생성
- [ ] 데이터베이스 연결 정보 저장

#### 1.2 테이블 스키마 설계 및 생성
```sql
-- teachers: 교사 정보
-- essays: 채점 대상 에세이
-- scores: 채점 데이터 (관계형)
-- parameters: MFRM 분석 결과 (파라미터)
-- facets: MFRM 파싯 정보
```

#### 1.3 Row Level Security (RLS) 설정
- [ ] 기본 보안 정책 설정
- [ ] API 키 발급 및 저장

---

### **Phase 2: R 백엔드 개발 (4-5시간)**

#### 2.1 R 패키지 및 함수 완성
- [ ] Supabase PostgreSQL 연동 코드 작성
- [ ] MFRM 모델 구현 (TAM 패키지)
- [ ] 평가자 지표 계산 로직
- [ ] API 엔드포인트 구현

#### 2.2 로컬 테스트
- [ ] 로컬 환경에서 R API 실행
- [ ] Supabase 연동 테스트
- [ ] MFRM 계산 검증

#### 2.3 Docker 설정
- [ ] Dockerfile 작성
- [ ] docker-compose.yml 작성 (로컬 테스트용)
- [ ] 환경 변수 설정 (.env)

---

### **Phase 3: Oracle Cloud 설정 (3-4시간)**

#### 3.1 Oracle Cloud 계정 생성
- [ ] 계정 생성 (신용카드 필요, 과금 안됨)
- [ ] Always Free 확인

#### 3.2 VM 인스턴스 생성
- [ ] Compute → Instances → Create Instance
- [ ] Image: Oracle Linux 8 (ARM)
- [ ] Shape: VM.Standard.A1.Flex (4 OCPU, 24GB RAM)
- [ ] 네트워크 설정 (Public IP)

#### 3.3 방화벽 및 보안 설정
- [ ] Ingress Rule 추가 (포트 8000)
- [ ] SSH 키 생성 및 등록

#### 3.4 VM에 Docker 설치
```bash
# Docker 설치
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 3.5 R 백엔드 배포
- [ ] GitHub에서 코드 클론
- [ ] 환경 변수 설정 (Supabase 연결 정보)
- [ ] Docker 컨테이너 실행
- [ ] 헬스 체크 확인

---

### **Phase 4: 프론트엔드 개발 (5-6시간)**

#### 4.1 프로젝트 초기화
- [ ] React 프로젝트 의존성 설치
- [ ] TypeScript 타입 정의
- [ ] Supabase 클라이언트 설정

#### 4.2 컴포넌트 개발
- [ ] 로그인 / 인증 화면
- [ ] 에세이 목록 화면
- [ ] 채점 인터페이스
- [ ] 분석 결과 대시보드
- [ ] 평가자 지표 시각화

#### 4.3 API 연동
- [ ] Supabase 데이터 CRUD
- [ ] Oracle R API 호출
- [ ] 에러 핸들링
- [ ] 로딩 상태 관리

#### 4.4 UI/UX 개선
- [ ] 반응형 디자인
- [ ] 로딩 인디케이터
- [ ] 토스트 알림

---

### **Phase 5: Netlify 배포 (1시간)**

#### 5.1 Git 저장소 연결
- [ ] GitHub 리포지토리 생성
- [ ] Netlify 계정 연결

#### 5.2 빌드 설정
- [ ] Build command: `npm run build`
- [ ] Publish directory: `build/`
- [ ] 환경 변수 설정 (Supabase API 키, Oracle R API URL)

#### 5.3 배포 및 테스트
- [ ] 자동 배포 확인
- [ ] 프로덕션 환경 테스트

---

### **Phase 6: 통합 테스트 및 문서화 (2-3시간)**

#### 6.1 End-to-End 테스트
- [ ] 채점 데이터 입력
- [ ] MFRM 분석 실행
- [ ] 결과 확인

#### 6.2 성능 최적화
- [ ] API 응답 시간 측정
- [ ] 데이터베이스 쿼리 최적화
- [ ] 캐싱 전략 (필요 시)

#### 6.3 문서 작성
- [ ] README.md (프로젝트 소개)
- [ ] 배포 가이드
- [ ] 사용자 매뉴얼
- [ ] API 문서

---

## ⏱️ 예상 소요 시간

| Phase | 작업 내용 | 예상 시간 |
|-------|----------|-----------|
| Phase 1 | Supabase DB 구축 | 2-3시간 |
| Phase 2 | R 백엔드 개발 | 4-5시간 |
| Phase 3 | Oracle Cloud 설정 | 3-4시간 |
| Phase 4 | 프론트엔드 개발 | 5-6시간 |
| Phase 5 | Netlify 배포 | 1시간 |
| Phase 6 | 테스트 및 문서화 | 2-3시간 |
| **총계** | | **17-22시간** |

> 💡 **실제로는 25-30시간 예상** (디버깅, 예상치 못한 문제 해결 포함)

---

## 💰 최종 예상 비용

| 서비스 | 플랜 | 월 비용 |
|--------|------|---------|
| **Netlify** | Starter (Free) | **$0** |
| **Supabase** | Free Tier | **$0** |
| **Oracle Cloud** | Always Free | **$0** |
| **도메인** | (선택) Namecheap | $10/년 (선택사항) |
| **총계** | | **$0/월** 🎉 |

### 무료 플랜 한계

**Supabase Free Tier:**
- 500MB DB 저장소 → 약 10만 건의 채점 데이터 저장 가능
- 5GB 대역폭/월 → 일 평균 사용자 50-100명 수준
- 50K MAU → 충분함

**Oracle Cloud Always Free:**
- 4 vCPU, 24GB RAM → MFRM 계산에 충분한 성능
- 무제한 실행 시간
- 슬립 없음

**Netlify Free:**
- 100GB 대역폭/월 → 충분함
- 300분 빌드 시간/월 → 충분함

---

## 🎯 마일스톤

### Week 1: 인프라 구축
- ✅ Supabase 데이터베이스 완성
- ✅ Oracle Cloud VM 설정 완료
- ✅ R 백엔드 배포 성공

### Week 2: 애플리케이션 개발
- ✅ 프론트엔드 주요 기능 구현
- ✅ API 연동 완료
- ✅ 기본 채점 흐름 작동

### Week 3: 완성 및 배포
- ✅ UI/UX 개선
- ✅ 통합 테스트
- ✅ 프로덕션 배포
- ✅ 문서화

---

## 🔐 보안 고려사항

1. **환경 변수 관리**
   - Supabase API 키는 환경 변수로 관리
   - Oracle VM에는 .env 파일 사용
   - GitHub에 비밀 정보 푸시 금지

2. **Supabase Row Level Security**
   - 교사는 자신의 채점만 조회/수정 가능
   - 관리자는 모든 데이터 접근 가능

3. **Oracle Cloud 방화벽**
   - SSH (22번 포트): 특정 IP만 허용
   - API (8000번 포트): 퍼블릭 허용 (또는 Netlify IP만 허용)

---

## 📚 필요한 기술 스택 정리

### 백엔드 (R)
- `plumber`: REST API
- `TAM`: MFRM 모델
- `RPostgreSQL`: Supabase 연동
- `jsonlite`: JSON 처리
- `dotenv`: 환경 변수

### 프론트엔드 (React)
- `react`, `react-dom`
- `typescript`
- `@supabase/supabase-js`: Supabase 클라이언트
- `axios`: HTTP 요청
- `recharts`: 데이터 시각화 (선택)
- `react-router-dom`: 라우팅

### 인프라
- Docker
- Git
- SSH

---

## 🚀 다음 단계

현재 계획이 수립되었습니다. 다음 중 선택해주세요:

1. **즉시 구현 시작**: Phase 1부터 단계별로 구현 시작
2. **특정 Phase 먼저**: 예) "Phase 1만 먼저 해줘"
3. **계획 수정**: 추가하거나 변경할 내용이 있으면 말씀해주세요

---

## 📝 참고 링크

- [Supabase 문서](https://supabase.com/docs)
- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [TAM 패키지 가이드](https://cran.r-project.org/web/packages/TAM/TAM.pdf)
- [Plumber API 문서](https://www.rplumber.io/)
- [Netlify 배포 가이드](https://docs.netlify.com/)

---

**마지막 업데이트:** 2025-11-15

