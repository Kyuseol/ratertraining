# ⚡ MFRM 시스템 빠른 시작 가이드

**5분 안에 시작하기! 이미 설정이 완료된 경우**

---

## 🎯 목적에 따른 가이드 선택

| 목적 | 가이드 | 소요 시간 |
|------|--------|-----------|
| 🚀 **처음 시작** (설정 필요) | [SETUP_GUIDE.md](SETUP_GUIDE.md) | 30-60분 |
| ⚡ **로컬 실행** (설정 완료) | [RUN_LOCAL.md](RUN_LOCAL.md) | 5분 |
| 🌐 **프로덕션 배포** | [DEPLOYMENT.md](DEPLOYMENT.md) | 1-2시간 |
| 🔧 **환경 변수 설정** | [ENV_SETUP.md](ENV_SETUP.md) | 10분 |
| 📖 **프로젝트 이해** | [README.md](README.md) | 10분 |
| 👨‍💻 **개발자 가이드** | [CLAUDE.md](CLAUDE.md) | 20분 |

---

## ✅ 사전 준비 체크리스트

빠른 시작 전에 확인하세요:

### 필수
- [ ] Node.js 18+ 설치됨
- [ ] R 4.3+ 설치됨
- [ ] Supabase 프로젝트 생성됨
- [ ] database/schema.sql 실행됨
- [ ] backend/.env 파일 생성됨
- [ ] frontend/.env 파일 생성됨
- [ ] R 패키지 설치됨 (TAM, plumber 등)
- [ ] npm 의존성 설치됨 (npm install)

### 하나라도 안 되어 있다면?
👉 [SETUP_GUIDE.md](SETUP_GUIDE.md)로 이동하세요!

---

## 🚀 빠른 실행 (로컬)

### 터미널 1: 백엔드 실행
```powershell
cd backend
Rscript -e "pr <- plumber::plumb('fluber.R'); pr$run(host='0.0.0.0', port=8000)"
```

**성공 메시지:**
```
Running plumber API at http://0.0.0.0:8000
```

### 터미널 2: 프론트엔드 실행
```powershell
cd frontend
npm start
```

**성공:** 브라우저 자동 열림 → `http://localhost:3000`

---

## 🧪 빠른 테스트

### 1. 백엔드 테스트
```powershell
# 터미널에서
cd backend
Rscript test_api.R
```

또는 브라우저에서:
```
http://localhost:8000/health
http://localhost:8000/api/info
```

### 2. 프론트엔드 테스트
```
http://localhost:3000
```

**로그인 계정 (샘플 데이터):**
```
교사: teacher1@example.com
관리자: admin@example.com (DB에 추가 필요)
```

---

## 📝 샘플 데이터 추가

### 관리자 계정 추가
Supabase SQL Editor에서:
```sql
INSERT INTO admins (email, name, is_active) 
VALUES ('admin@example.com', '관리자', true);
```

### 교사 확인
```sql
SELECT * FROM teachers;
```

### 에세이 확인
```sql
SELECT * FROM essays;
```

---

## 🎯 주요 기능 체험

### 교사 모드
1. ✅ 로그인 (teacher1@example.com)
2. ✅ "채점하기" 클릭
3. ✅ 에세이 1편 채점 (9개 요소 × 3점)
4. ✅ 6편 채점 → "예비 진단" 단계 달성
5. ✅ "내 리포트" 확인

### 관리자 모드
1. ✅ 로그인 (admin@example.com)
2. ✅ "에세이 관리" → 새 에세이 추가
3. ✅ 앵커 에세이 설정 + 해설 카드 작성
4. ✅ "앵커 관리" → 커버리지 매트릭스 확인

---

## 🔧 문제 해결 (빠른)

### "포트 8000이 이미 사용 중"
```powershell
# Windows
netstat -ano | findstr :8000
taskkill /PID [PID번호] /F
```

### "데이터베이스 연결 실패"
1. backend/.env 파일 확인
2. Supabase Dashboard에서 연결 정보 재확인
3. schema.sql 실행했는지 확인

### "로그인 실패"
```sql
-- Supabase SQL Editor에서
SELECT * FROM teachers WHERE email = 'teacher1@example.com';
SELECT * FROM admins WHERE email = 'admin@example.com';
```

---

## 📚 상세 가이드 링크

### 처음 시작
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - 완전 초기 설정
- [ENV_SETUP.md](ENV_SETUP.md) - 환경 변수 설정

### 실행
- [RUN_LOCAL.md](RUN_LOCAL.md) - 로컬 실행 상세
- [backend/test_api.R](backend/test_api.R) - API 테스트 스크립트

### 배포
- [DEPLOYMENT.md](DEPLOYMENT.md) - 프로덕션 배포
- [README.md](README.md) - 프로젝트 개요

### 개발
- [CLAUDE.md](CLAUDE.md) - 개발자 가이드
- [blueprint.md](blueprint.md) - Blueprint v0.9 설계

---

## 🎉 성공 확인

### ✅ 백엔드
```
http://localhost:8000/health → { "status": "ok" }
```

### ✅ 프론트엔드
```
http://localhost:3000 → 로그인 페이지 표시
```

### ✅ 통합
- 로그인 성공
- 대시보드 표시
- 데이터 읽기/쓰기 가능

---

## 💡 다음 단계

### 로컬 개발 완료 후:
1. 📝 [DEPLOYMENT.md](DEPLOYMENT.md) - 프로덕션 배포
2. 🔒 보안 설정 점검
3. 📊 모니터링 설정

---

## 📞 도움이 필요하신가요?

### 문서
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - 초기 설정
- [RUN_LOCAL.md](RUN_LOCAL.md) - 로컬 실행
- [DEPLOYMENT.md](DEPLOYMENT.md) - 배포
- [CLAUDE.md](CLAUDE.md) - 개발자 가이드

### 체크리스트
- [x] Supabase 프로젝트 생성?
- [x] schema.sql 실행?
- [x] .env 파일 설정?
- [x] R 패키지 설치?
- [x] npm install 완료?

**하나라도 ❌ 라면 → SETUP_GUIDE.md 참고!**

---

**준비되셨나요? 시작해봅시다!** 🚀

```powershell
# 터미널 1
cd backend
Rscript -e "pr <- plumber::plumb('fluber.R'); pr$run(host='0.0.0.0', port=8000)"

# 터미널 2
cd frontend
npm start
```

**브라우저:** http://localhost:3000 🎯

