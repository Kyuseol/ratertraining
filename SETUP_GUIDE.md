# 🚀 MFRM 시스템 설정 및 실행 가이드

**완전 초기 설정부터 배포까지 단계별 가이드**

---

## 📋 목차

1. [사전 준비](#1-사전-준비)
2. [Supabase 설정](#2-supabase-설정)
3. [로컬 환경 설정](#3-로컬-환경-설정)
4. [로컬 실행 및 테스트](#4-로컬-실행-및-테스트)
5. [배포](#5-배포)
6. [문제 해결](#6-문제-해결)

---

## 1. 사전 준비

### 필수 설치 항목

#### Windows 기준
```powershell
# Node.js 18+ 설치 확인
node --version  # v18.x.x 이상

# npm 확인
npm --version

# R 설치 확인 (4.3 이상)
R --version

# Git 확인
git --version
```

#### 필요한 도구
- ✅ **Node.js 18+** (https://nodejs.org)
- ✅ **R 4.3+** (https://cran.r-project.org)
- ✅ **Git** (https://git-scm.com)
- ⚠️ **RTools** (Windows, R 패키지 컴파일용)

---

## 2. Supabase 설정

### 2.1 Supabase 프로젝트 생성

1. **https://supabase.com** 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인
4. "New Project" 클릭

**프로젝트 정보 입력:**
```
Name: mfrm-rater-training
Database Password: [안전한 비밀번호 생성 및 저장!]
Region: Northeast Asia (Seoul)
Pricing Plan: Free
```

5. "Create new project" 클릭 (약 2분 소요)

### 2.2 데이터베이스 스키마 적용

1. Supabase Dashboard → **SQL Editor**
2. 새 쿼리 생성
3. `database/schema.sql` 파일 내용 전체 복사
4. 붙여넣기 후 **"RUN"** 클릭
5. 성공 메시지 확인

### 2.3 API 키 확인 및 저장

**Settings → API** 메뉴에서:

```bash
# 저장해야 할 정보:
Project URL: https://xxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (비공개!)
```

**Settings → Database** 메뉴에서:

```bash
Host: db.xxxxx.supabase.co
Port: 5432
Database name: postgres
User: postgres
Password: [2.1에서 설정한 비밀번호]
```

⚠️ **중요**: `service_role key`는 백엔드에만 사용! 절대 프론트엔드에 넣지 마세요!

---

## 3. 로컬 환경 설정

### 3.1 프로젝트 클론
```bash
git clone <your-repo-url>
cd mfrm-project
```

### 3.2 백엔드 환경 변수 설정

```bash
cd backend
copy .env.example .env
notepad .env
```

**`.env` 파일 내용 (실제 값으로 변경):**
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

SUPABASE_DB_HOST=db.xxxxx.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your_database_password

API_PORT=8000
API_HOST=0.0.0.0
ALLOWED_ORIGINS=http://localhost:3000
LOG_LEVEL=INFO
```

### 3.3 R 패키지 설치

```bash
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
))

# 설치 확인
library(plumber)
library(TAM)

# 종료
q()
```

⚠️ **설치 시간**: 10-20분 소요 (TAM 패키지가 큽니다)

### 3.4 프론트엔드 환경 변수 설정

```bash
cd ../frontend
copy .env.example .env
notepad .env
```

**`.env` 파일 내용:**
```bash
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key

REACT_APP_R_API_URL=http://localhost:8000

REACT_APP_NAME=MFRM 쓰기 평가 문식성 시스템
REACT_APP_VERSION=1.0.0
```

### 3.5 프론트엔드 의존성 설치

```bash
npm install
```

⚠️ **설치 시간**: 2-5분 소요

---

## 4. 로컬 실행 및 테스트

### 4.1 백엔드 실행

**터미널 1 (백엔드):**
```bash
cd backend

# R API 서버 시작
Rscript -e "pr <- plumber::plumb('fluber.R'); pr$run(host='0.0.0.0', port=8000)"
```

✅ **성공 시 출력:**
```
Starting server to listen on port 8000
Running plumber API at http://0.0.0.0:8000
```

**테스트:**
```bash
# 브라우저에서 또는 curl로
http://localhost:8000/health

# 응답:
{
  "status": "ok",
  "service": "MFRM API",
  "version": "1.0.0",
  ...
}
```

### 4.2 프론트엔드 실행

**터미널 2 (프론트엔드):**
```bash
cd frontend
npm start
```

✅ **성공 시:**
- 자동으로 브라우저 열림: `http://localhost:3000`
- 로그인 페이지 표시

### 4.3 기능 테스트

#### 4.3.1 로그인 테스트
```
교사 계정:
- Email: teacher1@example.com
- Password: (아무거나 - 데모 모드)

관리자 계정:
- Email: admin@example.com (데이터베이스에 추가 필요)
```

#### 4.3.2 데이터베이스에 관리자 추가

**Supabase SQL Editor에서 실행:**
```sql
INSERT INTO admins (email, name, is_active) 
VALUES ('admin@example.com', '관리자', true);
```

#### 4.3.3 교사 모드 테스트
1. ✅ 로그인 → 대시보드 확인 (0편 상태)
2. ✅ "채점하기" → 에세이 1편 채점 (9개 요소)
3. ✅ 채점 완료 → 대시보드에서 1편 확인
4. ✅ 6편 채점 → "예비 진단" 단계 달성
5. ✅ "내 리포트" → 데이터 부족 메시지 확인

#### 4.3.4 관리자 모드 테스트
1. ✅ 로그인 → 대시보드 (시스템 통계)
2. ✅ "에세이 관리" → 새 에세이 추가
3. ✅ 앵커 에세이 설정 + 해설 카드 작성
4. ✅ "앵커 관리" → 커버리지 매트릭스 확인

---

## 5. 배포

### 5.1 Netlify (프론트엔드)

#### 5.1.1 GitHub에 푸시
```bash
git add .
git commit -m "feat: 프로젝트 초기 설정 완료"
git push origin main
```

#### 5.1.2 Netlify 배포
1. **https://netlify.com** 로그인
2. "Add new site" → "Import an existing project"
3. GitHub 연결 → 리포지토리 선택
4. **Build settings:**
   ```
   Base directory: frontend
   Build command: npm run build
   Publish directory: frontend/build
   ```
5. **Environment variables 추가:**
   ```
   REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your_anon_key
   REACT_APP_R_API_URL=https://your-oracle-ip:8000
   ```
6. "Deploy site" 클릭

✅ **배포 완료**: `https://your-app.netlify.app`

### 5.2 Oracle Cloud (백엔드) - 선택사항

#### 5.2.1 VM 인스턴스 생성
1. **https://cloud.oracle.com** 가입 (Always Free)
2. Compute → Instances → "Create Instance"
3. **설정:**
   ```
   Name: mfrm-r-backend
   Image: Oracle Linux 8
   Shape: VM.Standard.A1.Flex (ARM)
   OCPU: 4
   Memory: 24GB
   ```
4. SSH 키 생성 및 다운로드

#### 5.2.2 방화벽 설정
```bash
# VM에 SSH 접속
ssh -i private_key.pem opc@<PUBLIC_IP>

# 방화벽 규칙 추가
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

#### 5.2.3 Docker 설치 및 실행
```bash
# Docker 설치
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# 프로젝트 업로드
scp -i private_key.pem -r backend/* opc@<PUBLIC_IP>:~/mfrm-backend/

# Docker Compose 실행
cd ~/mfrm-backend
docker-compose up -d
```

### 5.3 배포 완료 확인

#### 프론트엔드
- ✅ `https://your-app.netlify.app` 접속 가능
- ✅ 로그인 페이지 표시

#### 백엔드 (Oracle Cloud)
- ✅ `http://<ORACLE_IP>:8000/health` 응답 확인

---

## 6. 문제 해결

### 6.1 백엔드 문제

#### 문제: R 패키지 설치 실패
```bash
# Windows: RTools 설치 필요
# https://cran.r-project.org/bin/windows/Rtools/

# 또는 바이너리 패키지 사용
install.packages("TAM", type="win.binary")
```

#### 문제: 포트 8000이 이미 사용 중
```bash
# .env에서 포트 변경
API_PORT=8001

# 프론트엔드 .env도 변경
REACT_APP_R_API_URL=http://localhost:8001
```

#### 문제: 데이터베이스 연결 실패
```bash
# db.R 파일에서 연결 정보 확인
# Supabase에서 Database → Settings → Connection string 재확인
```

### 6.2 프론트엔드 문제

#### 문제: npm install 실패
```bash
# 캐시 삭제 후 재시도
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### 문제: CORS 에러
```bash
# 백엔드 .env에서
ALLOWED_ORIGINS=http://localhost:3000,https://your-app.netlify.app
```

#### 문제: 로그인 시 "사용자를 찾을 수 없습니다"
```sql
-- Supabase SQL Editor에서 교사 확인
SELECT * FROM teachers WHERE email = 'teacher1@example.com';

-- 없으면 추가
INSERT INTO teachers (email, name, institution) 
VALUES ('test@example.com', '테스트교사', '테스트학교');
```

### 6.3 배포 문제

#### 문제: Netlify 빌드 실패
```bash
# 로컬에서 빌드 테스트
cd frontend
npm run build

# 에러 확인 후 수정
```

#### 문제: 백엔드 API 연결 안됨 (배포 후)
```bash
# Oracle Cloud 방화벽 확인
sudo firewall-cmd --list-all

# Ingress Rules 확인 (Supabase Dashboard)
```

---

## 📞 추가 지원

### 유용한 명령어

**로그 확인:**
```bash
# 백엔드 (Docker)
docker logs -f mfrm-r-api

# 프론트엔드 (브라우저 콘솔)
F12 → Console
```

**데이터베이스 직접 접근:**
```bash
# Supabase Dashboard → Database → Tables
# 또는 SQL Editor에서 쿼리 실행
```

**API 테스트:**
```bash
# curl 사용
curl http://localhost:8000/health
curl http://localhost:8000/api/info
```

### 문서
- **README.md**: 프로젝트 개요
- **CLAUDE.md**: 개발자 가이드
- **blueprint.md**: Blueprint v0.9 설계
- **PROJECT_SUMMARY.md**: 완성 보고서

---

**설정 완료 시간**: 약 30-60분  
**난이도**: 중급 (R 설치가 가장 까다로움)

---

## ✅ 체크리스트

### 환경 설정
- [ ] Node.js 18+ 설치
- [ ] R 4.3+ 설치
- [ ] Supabase 프로젝트 생성
- [ ] 데이터베이스 스키마 적용
- [ ] 백엔드 .env 설정
- [ ] 프론트엔드 .env 설정
- [ ] R 패키지 설치
- [ ] npm 의존성 설치

### 로컬 테스트
- [ ] 백엔드 /health 응답 확인
- [ ] 프론트엔드 로그인 페이지 표시
- [ ] 교사 로그인 성공
- [ ] 에세이 채점 기능 동작
- [ ] 관리자 로그인 성공
- [ ] 에세이 추가 기능 동작

### 배포 (선택)
- [ ] GitHub에 푸시
- [ ] Netlify 배포 완료
- [ ] Oracle Cloud 설정 (선택)
- [ ] 배포 환경에서 동작 확인

---

**준비되셨나요? 시작해봅시다!** 🚀

