# 🚀 Step 2: 로컬 실행 테스트 가이드

**백엔드(R API) + 프론트엔드(React) 동시 실행**

---

## 🎯 목표

- ✅ 백엔드 R API 서버 실행 (포트 8000)
- ✅ 프론트엔드 React 앱 실행 (포트 3000)
- ✅ 브라우저에서 접속 및 로그인 테스트

---

## 📋 사전 확인

시작하기 전에:

- [x] R 설치 완료 (R 4.2.3)
- [x] R 패키지 설치 (plumber, TAM, RPostgreSQL 등)
- [x] Node.js 설치 (v22.16.0)
- [x] npm 의존성 설치 (frontend/node_modules)
- [x] Supabase 설정 완료
- [x] backend/.env 업데이트
- [x] frontend/.env 업데이트

---

## 🔧 터미널 1: 백엔드 실행

### Step 1: R PATH 설정 (필수!)

**PowerShell 터미널 1 열기:**

```powershell
# R 실행 경로를 PATH에 추가
$env:Path += ";C:\Program Files\R\R-4.2.3\bin\x64"

# 확인
Rscript --version
```

**성공 시 출력:**
```
Rscript (R) version 4.2.3 (2023-03-15)
```

---

### Step 2: 백엔드 디렉토리로 이동

```powershell
cd backend
```

---

### Step 3: API 서버 실행

```powershell
Rscript -e "pr <- plumber::plumb('fluber.R'); pr$run(host='0.0.0.0', port=8000)"
```

---

### ✅ 성공 확인

**예상 출력:**
```
Running plumber API at http://0.0.0.0:8000
Running swagger Docs at http://127.0.0.1:8000/__docs__/
```

**브라우저에서 확인:**
```
http://localhost:8000/health
```

**예상 응답:**
```json
{
  "status": "ok",
  "service": "MFRM API",
  "version": "1.0.0",
  "r_version": "4.2.3",
  "timestamp": "2025-11-16T..."
}
```

✅ **백엔드 실행 성공!**

**⚠️ 이 터미널은 그대로 두고 새 터미널을 여세요!**

---

## 🎨 터미널 2: 프론트엔드 실행

### Step 1: 새 PowerShell 터미널 열기

**PowerShell 새 창 열기** (터미널 1은 그대로 유지)

---

### Step 2: 프론트엔드 디렉토리로 이동

```powershell
cd C:\project\mfrm-project\frontend
```

---

### Step 3: React 앱 실행

```powershell
npm start
```

---

### ✅ 성공 확인

**예상 출력:**
```
Compiled successfully!

You can now view mfrm-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000

webpack compiled successfully
```

**브라우저 자동 열림:**
```
http://localhost:3000
```

✅ **로그인 페이지가 표시되면 성공!**

---

## 🌐 브라우저 테스트

### 1. 로그인 페이지 확인

```
http://localhost:3000
```

**예상 화면:**
```
┌─────────────────────────────────────┐
│   📚 MFRM 쓰기 평가 문식성          │
│   Blueprint v0.9                     │
│                                      │
│   [ ] 교사    [ ] 관리자            │
│                                      │
│   이메일: _____________________     │
│   비밀번호: ___________________     │
│                                      │
│        [ 로그인 ]                    │
└─────────────────────────────────────┘
```

---

### 2. 교사 계정으로 로그인 테스트

**샘플 계정:**
```
이메일: teacher1@example.com
비밀번호: (아무거나 입력)
```

**로그인 클릭**

✅ **교사 대시보드**가 표시되면 성공!

**예상 화면:**
```
환영합니다, 김영희 교사님!

📊 나의 진단 단계: 미참여 (0단계)
채점한 에세이: 0편

[채점하기] [내 리포트] [훈련 과제]
```

---

### 3. 관리자 계정 추가 (필요 시)

관리자로 로그인하려면 먼저 관리자 계정을 추가해야 합니다.

**Supabase Dashboard → SQL Editor:**

```sql
INSERT INTO admins (email, name, is_active) 
VALUES ('admin@example.com', '관리자', true);
```

**"RUN"** 클릭

**로그인 테스트:**
```
이메일: admin@example.com
비밀번호: (아무거나)
```

✅ **관리자 대시보드**가 표시되면 성공!

---

## 🧪 기능 테스트

### 테스트 1: 교사 - 에세이 채점

1. **교사로 로그인** (teacher1@example.com)
2. **"채점하기"** 버튼 클릭
3. 에세이가 표시되는지 확인
4. 9개 평가요소에 대해 1-3점 선택
5. **"제출"** 버튼 클릭
6. 대시보드로 돌아와서 "채점한 에세이: 1편" 확인

✅ **채점 기능 작동!**

---

### 테스트 2: 관리자 - 에세이 관리

1. **관리자로 로그인** (admin@example.com)
2. **"에세이 관리"** 클릭
3. **"새 에세이 추가"** 버튼 클릭
4. 제목, 내용 등 입력
5. **"에세이 추가"** 클릭
6. 목록에 새 에세이가 추가되었는지 확인

✅ **관리자 기능 작동!**

---

## ✅ 성공 확인 체크리스트

### 백엔드
- [ ] R API 서버 실행됨 (포트 8000)
- [ ] http://localhost:8000/health 응답 OK
- [ ] 터미널에 에러 없음

### 프론트엔드
- [ ] React 앱 실행됨 (포트 3000)
- [ ] http://localhost:3000 로그인 페이지 표시
- [ ] 브라우저 콘솔 에러 없음 (F12 → Console)

### 통합 테스트
- [ ] 교사 로그인 성공
- [ ] 교사 대시보드 표시
- [ ] 에세이 채점 가능
- [ ] 관리자 로그인 성공 (계정 추가 후)
- [ ] 관리자 기능 작동

---

## 🐛 문제 해결

### 문제 1: "Rscript 명령을 찾을 수 없습니다"

**원인:** R PATH가 설정되지 않음

**해결:**
```powershell
$env:Path += ";C:\Program Files\R\R-4.2.3\bin\x64"
Rscript --version
```

---

### 문제 2: "포트 8000이 이미 사용 중"

**원인:** 이미 백엔드가 실행 중이거나 다른 프로그램이 사용 중

**해결:**
```powershell
# Windows에서 포트 사용 프로세스 확인
netstat -ano | findstr :8000

# 프로세스 종료
taskkill /PID [PID번호] /F

# 또는 다른 포트 사용 (backend/.env에서 API_PORT 변경)
```

---

### 문제 3: "Failed to connect to database"

**원인:** Supabase 연결 정보가 잘못됨

**해결:**
1. `backend/.env` 파일 확인
2. SUPABASE_DB_HOST, SUPABASE_DB_PASSWORD 재확인
3. Supabase Dashboard → Settings → Database에서 정보 재확인

---

### 문제 4: 프론트엔드 "CORS error"

**원인:** 백엔드 CORS 설정 문제

**해결:**
```bash
# backend/.env에서
ALLOWED_ORIGINS=http://localhost:3000

# 백엔드 재시작
```

---

### 문제 5: "로그인 실패 - 사용자를 찾을 수 없습니다"

**원인:** Supabase에 해당 이메일의 교사/관리자가 없음

**해결:**

**교사 계정 확인:**
```sql
SELECT * FROM teachers WHERE email = 'teacher1@example.com';
```

없으면 추가:
```sql
INSERT INTO teachers (email, name, institution) 
VALUES ('test@example.com', '테스트교사', '테스트학교');
```

---

### 문제 6: 백엔드 실행 시 패키지 에러

**원인:** R 패키지가 설치되지 않음

**해결:**
```r
# R 실행
R

# 패키지 설치
install.packages(c("plumber", "TAM", "RPostgreSQL", "jsonlite", "dplyr", "tidyr"))

# 종료
q()
```

---

## 📊 로그 확인

### 백엔드 로그

터미널 1에서 실시간 로그 확인:
```
[INFO] GET /health
[INFO] GET /api/stats/teachers
```

### 프론트엔드 로그

브라우저에서 F12 → Console:
```
React App is running...
```

에러가 있다면 빨간색으로 표시됨

---

## 🎉 성공!

모든 테스트를 통과했다면:

✅ **로컬 실행 완료!**

**진행률:**
```
████████████████████████ 80%

✅ 환경 구축
✅ Supabase 설정
✅ 환경 변수 설정
✅ 로컬 실행 성공! ← 현재
⬜ 배포
```

---

## 🚀 다음 단계

### 선택 1: 더 많은 기능 테스트

- MFRM 분석 실행 (충분한 데이터 필요)
- 교사 리포트 확인
- 앵커 에세이 관리
- 미세 조정 과제

### 선택 2: 프로덕션 배포

**DEPLOYMENT.md** 참고:
- Netlify에 프론트엔드 배포
- Oracle Cloud에 백엔드 배포

---

## 📚 참고 문서

- **RUN_LOCAL.md** - 로컬 실행 상세 가이드
- **QUICK_START.md** - 빠른 시작 가이드
- **DEPLOYMENT.md** - 배포 가이드
- **CHECK_STATUS.md** - 전체 상태 확인

---

**로컬에서 정상 작동하고 있나요?** 🎉  
**축하합니다! 이제 배포할 준비가 되었습니다!** 🚀

