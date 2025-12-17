# 🏃 로컬 실행 빠른 가이드

**5분 안에 로컬에서 실행하기**

---

## ⚡ 빠른 시작 (이미 설정 완료한 경우)

### 터미널 1: 백엔드
```bash
cd backend
Rscript -e "pr <- plumber::plumb('fluber.R'); pr$run(host='0.0.0.0', port=8000)"
```

### 터미널 2: 프론트엔드
```bash
cd frontend
npm start
```

### 브라우저
```
http://localhost:3000
```

---

## 🔧 처음 실행하는 경우

### 1단계: 환경 변수 설정 (1회만)

**백엔드:**
```bash
cd backend
copy .env.example .env
# .env 파일을 편집하여 Supabase 정보 입력
```

**프론트엔드:**
```bash
cd frontend
copy .env.example .env
# .env 파일을 편집하여 Supabase 정보 입력
```

### 2단계: 의존성 설치 (1회만)

**R 패키지:**
```r
# R 실행 후
install.packages(c("plumber", "TAM", "RPostgreSQL", "jsonlite", "dplyr", "tidyr", "dotenv"))
```

**Node.js 패키지:**
```bash
cd frontend
npm install
```

### 3단계: 실행

위의 "빠른 시작" 참조

---

## 🧪 테스트

### 백엔드 테스트
```bash
# 터미널에서
cd backend
Rscript test_api.R

# 또는 브라우저에서
http://localhost:8000/health
http://localhost:8000/api/info
```

### 프론트엔드 테스트
```bash
# 브라우저에서
http://localhost:3000

# 로그인:
교사: teacher1@example.com
관리자: admin@example.com
```

---

## 📝 체크리스트

실행 전 확인:
- [ ] Supabase 프로젝트 생성 완료
- [ ] database/schema.sql 실행 완료
- [ ] .env 파일 설정 완료 (backend, frontend 모두)
- [ ] R 패키지 설치 완료
- [ ] npm 의존성 설치 완료

실행 확인:
- [ ] 백엔드 http://localhost:8000/health 응답 OK
- [ ] 프론트엔드 http://localhost:3000 로그인 페이지 표시
- [ ] 로그인 성공
- [ ] 대시보드 표시

---

## 🚨 문제 해결

### "포트 8000이 이미 사용 중"
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID [PID번호] /F

# 또는 .env에서 포트 변경
API_PORT=8001
```

### "데이터베이스 연결 실패"
1. Supabase Dashboard → Settings → Database
2. Connection string 재확인
3. .env 파일의 정보가 정확한지 확인

### "npm install 실패"
```bash
npm cache clean --force
rm -rf node_modules
npm install
```

### "R 패키지 설치 실패"
```bash
# RTools 설치 (Windows)
# https://cran.r-project.org/bin/windows/Rtools/

# 또는 바이너리로 설치
install.packages("TAM", type="win.binary")
```

---

## 📚 상세 가이드

더 자세한 내용은:
- **SETUP_GUIDE.md**: 완전 설정 가이드
- **README.md**: 프로젝트 개요
- **PROJECT_SUMMARY.md**: 구현 완료 보고서

---

**준비 완료? 실행해봅시다!** 🚀

터미널 1 → 백엔드 실행  
터미널 2 → 프론트엔드 실행  
브라우저 → http://localhost:3000

