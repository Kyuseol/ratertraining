# 📋 설치 상태 체크 결과

**확인 일시**: 2025-11-16  
**시스템**: Windows 10 (PowerShell)

---

## ✅ 설치 완료 항목

### 1. Node.js ✨
```
버전: v22.16.0
요구사항: 18+
상태: ✅ 충족
```

### 2. 환경 변수 파일 ✅
```
backend/.env: ✅ 존재
frontend/.env: ✅ 존재
```

### 3. NPM 의존성 ✅
```
frontend/node_modules: ✅ 설치됨
```

---

## ❌ 설치 필요 항목

### 4. R (통계 프로그램) ❌

**상태**: 설치되지 않음

**설치 방법 (수동):**

1. **공식 웹사이트에서 다운로드**
   ```
   https://cran.r-project.org/bin/windows/base/
   ```

2. **다운로드**
   - "Download R-4.4.2 for Windows" (최신 버전) 클릭
   - 파일 크기: ~85 MB

3. **설치**
   - 다운로드한 `.exe` 파일 실행
   - "Next" 클릭 (기본 설정 유지)
   - 설치 경로: `C:\Program Files\R\R-4.4.2`
   - 시간: 약 5분

4. **설치 확인**
   ```powershell
   R --version
   ```
   
   **성공 시 출력:**
   ```
   R version 4.4.2 (2024-xx-xx) -- "..."
   ```

5. **RTools 설치 (Windows 전용, R 패키지 컴파일용)**
   ```
   https://cran.r-project.org/bin/windows/Rtools/
   ```
   - "RTools 4.4" 다운로드
   - 설치 후 R 재시작

---

### 5. R 패키지 설치 ⚠️

**R 설치 후 실행:**

```r
# R 실행
R

# R 콘솔에서:
install.packages(c(
  "plumber",
  "TAM",
  "RPostgreSQL",
  "jsonlite",
  "dplyr",
  "tidyr",
  "dotenv"
), repos="https://cran.rstudio.com/")

# 설치 확인
library(plumber)
library(TAM)

# 종료
q()
```

**소요 시간**: 15-30분 (TAM 패키지가 큽니다)

---

### 6. Supabase 프로젝트 생성 ⚠️

**웹에서 수동 설정 필요:**

1. **https://supabase.com** 접속
2. GitHub 계정으로 로그인
3. "New Project" 클릭
4. **프로젝트 정보 입력:**
   ```
   Name: mfrm-rater-training
   Database Password: [안전한 비밀번호 생성]
   Region: Northeast Asia (Seoul)
   Pricing Plan: Free
   ```
5. "Create new project" 클릭 (약 2분 소요)

---

### 7. database/schema.sql 실행 ⚠️

**Supabase Dashboard에서:**

1. **SQL Editor** 메뉴 클릭
2. 새 쿼리 생성
3. `database/schema.sql` 파일 내용 복사
4. 붙여넣기
5. **"RUN"** 클릭
6. 성공 메시지 확인

---

## 📝 다음 단계

### R 설치 후:

```powershell
# 1. R 버전 확인
R --version

# 2. R 패키지 설치
R
# (위의 install.packages 명령 실행)

# 3. 백엔드 테스트
cd backend
Rscript test_api.R

# 4. 백엔드 실행
Rscript -e "pr <- plumber::plumb('fluber.R'); pr$run(host='0.0.0.0', port=8000)"
```

### Supabase 설정 후:

```powershell
# 1. 환경 변수 업데이트
# backend/.env에 Supabase 정보 입력
# frontend/.env에 Supabase 정보 입력

# 2. 프론트엔드 실행
cd frontend
npm start
```

---

## 🎯 빠른 설치 가이드

### 순서:
1. ✅ Node.js - 이미 설치됨
2. ❌ **R 설치** ← 지금 할 것
3. ⚠️ **RTools 설치** (Windows)
4. ⚠️ **R 패키지 설치**
5. ⚠️ **Supabase 프로젝트 생성**
6. ⚠️ **schema.sql 실행**
7. ✅ 환경 변수 - 이미 설정됨
8. ✅ npm 의존성 - 이미 설치됨

---

## 📚 참고 문서

- **R 설치**: [SETUP_GUIDE.md](SETUP_GUIDE.md#r-설치)
- **환경 변수**: [ENV_SETUP.md](ENV_SETUP.md)
- **로컬 실행**: [RUN_LOCAL.md](RUN_LOCAL.md)
- **전체 가이드**: [QUICK_START.md](QUICK_START.md)

---

## ✅ 체크리스트 업데이트

- [x] Node.js 18+ 설치됨
- [ ] **R 4.3+ 설치** ← 다음 단계
- [ ] RTools 설치 (Windows)
- [ ] R 패키지 설치됨 (TAM, plumber 등)
- [ ] Supabase 프로젝트 생성됨
- [ ] database/schema.sql 실행됨
- [x] backend/.env 파일 생성됨
- [x] frontend/.env 파일 생성됨
- [x] npm 의존성 설치됨 (npm install)

---

## 🚀 R 설치 링크

**지금 바로 설치:**

1. **R 다운로드**: https://cran.r-project.org/bin/windows/base/
2. **RTools 다운로드**: https://cran.r-project.org/bin/windows/Rtools/

**설치 후 다시 확인:**
```powershell
R --version
```

---

**R 설치가 완료되면 다시 알려주세요!** 그러면 R 패키지 설치를 도와드리겠습니다. 🚀

