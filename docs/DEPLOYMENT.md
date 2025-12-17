# 🚀 배포 가이드

**MFRM 시스템을 프로덕션 환경에 배포하는 방법**

---

## 📋 목차

1. [배포 아키텍처](#배포-아키텍처)
2. [Supabase 프로덕션 설정](#supabase-프로덕션-설정)
3. [프론트엔드 배포 (Netlify)](#프론트엔드-배포-netlify)
4. [백엔드 배포 (Oracle Cloud)](#백엔드-배포-oracle-cloud)
5. [백엔드 배포 (Docker Compose)](#백엔드-배포-docker-compose)
6. [배포 후 확인](#배포-후-확인)
7. [유지보수](#유지보수)

---

## 배포 아키텍처

```
┌─────────────┐
│   사용자    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Netlify (CDN)   │  ← 프론트엔드 (React)
│ *.netlify.app   │
└────────┬────────┘
         │
         ├─────────────────┐
         ▼                 ▼
┌────────────────┐  ┌──────────────────┐
│ Supabase       │  │ Oracle Cloud VM  │  ← 백엔드 (R API)
│ (PostgreSQL)   │  │ R + Plumber      │
└────────────────┘  └──────────────────┘
```

---

## Supabase 프로덕션 설정

### 1. Row Level Security (RLS) 활성화

**Supabase Dashboard → Database → Tables**

```sql
-- 각 테이블에 RLS 활성화 (이미 schema.sql에 포함됨)
ALTER TABLE essays ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
```

### 2. 백업 설정

**Supabase Dashboard → Settings → Database → Backups**

- ✅ Enable daily backups
- ✅ Retention: 7 days (Free tier) / 30 days (Pro)

### 3. Rate Limiting 확인

**Supabase Dashboard → Settings → API**

- ✅ Rate limiting: 500 requests/second (기본값 확인)
- ⚠️ 트래픽이 많으면 Pro 플랜 고려

---

## 프론트엔드 배포 (Netlify)

### 옵션 1: GitHub 연동 (권장)

#### 1. GitHub에 푸시
```bash
git add .
git commit -m "deploy: 프로덕션 배포 준비"
git push origin main
```

#### 2. Netlify 배포 설정

1. **https://app.netlify.com** 로그인
2. "Add new site" → "Import an existing project"
3. "GitHub" 선택 → 리포지토리 연결
4. **Build settings 입력:**
   ```
   Base directory: frontend
   Build command: npm run build
   Publish directory: frontend/build
   ```

#### 3. Environment Variables 설정

**Site settings → Build & deploy → Environment variables**

```bash
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...
REACT_APP_R_API_URL=https://your-backend-url:8000
REACT_APP_NAME=MFRM 쓰기 평가 문식성 시스템
REACT_APP_VERSION=1.0.0
```

⚠️ **중요**: `REACT_APP_R_API_URL`은 백엔드 배포 후 업데이트하세요!

#### 4. 배포 트리거

- "Deploy site" 클릭
- 자동 배포: `main` 브랜치 푸시 시마다 자동 배포됨

#### 5. 커스텀 도메인 설정 (선택)

**Site settings → Domain management**
- "Add custom domain"
- DNS 설정 (A record, CNAME)

### 옵션 2: 수동 배포

```bash
cd frontend
npm run build
npx netlify-cli deploy --prod --dir=build
```

---

## 백엔드 배포 (Oracle Cloud)

### 준비: Oracle Cloud Always Free VM

#### 1. VM 인스턴스 생성

**https://cloud.oracle.com → Compute → Instances**

```
Name: mfrm-backend
Image: Oracle Linux 8
Shape: VM.Standard.A1.Flex (ARM)
  OCPU: 4
  Memory: 24 GB
Boot volume: 100 GB
```

#### 2. SSH 키 설정
- 키 페어 생성 또는 업로드
- Private key 안전하게 보관

#### 3. 방화벽 설정

**VCN → Security Lists → Default Security List**

**Ingress Rules 추가:**
```
포트 8000 (R API):
  Source CIDR: 0.0.0.0/0
  Destination Port: 8000
  Protocol: TCP

포트 22 (SSH):
  Source CIDR: your-ip/32 (보안 강화)
  Destination Port: 22
  Protocol: TCP
```

### 배포 단계

#### 1. SSH 접속
```bash
ssh -i private_key.pem opc@<PUBLIC_IP>
```

#### 2. R 설치
```bash
# EPEL 저장소 추가
sudo yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-8.noarch.rpm

# R 설치
sudo yum install -y R

# 개발 도구 설치
sudo yum install -y gcc gcc-c++ make libcurl-devel openssl-devel libxml2-devel postgresql-devel
```

#### 3. R 패키지 설치
```bash
sudo R
```

R 콘솔에서:
```r
install.packages(c(
  "plumber",
  "TAM",
  "RPostgreSQL",
  "jsonlite",
  "dplyr",
  "tidyr",
  "dotenv"
), repos="https://cran.rstudio.com/")

q()
```

⏱️ 시간: 20-30분 소요

#### 4. 프로젝트 업로드
```bash
# 로컬에서 (별도 터미널)
cd backend
scp -i private_key.pem -r * opc@<PUBLIC_IP>:~/mfrm-backend/
```

#### 5. 환경 변수 설정
```bash
# VM에서
cd ~/mfrm-backend
nano .env
```

`.env` 파일:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key
SUPABASE_DB_HOST=db.your-project.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your_password
API_PORT=8000
API_HOST=0.0.0.0
ALLOWED_ORIGINS=https://your-app.netlify.app,http://localhost:3000
```

#### 6. 방화벽 설정 (VM 내부)
```bash
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

#### 7. systemd 서비스 생성 (자동 시작)

```bash
sudo nano /etc/systemd/system/mfrm-api.service
```

파일 내용:
```ini
[Unit]
Description=MFRM R API Server
After=network.target

[Service]
Type=simple
User=opc
WorkingDirectory=/home/opc/mfrm-backend
ExecStart=/usr/bin/Rscript -e "pr <- plumber::plumb('/home/opc/mfrm-backend/fluber.R'); pr$run(host='0.0.0.0', port=8000)"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### 8. 서비스 시작
```bash
sudo systemctl daemon-reload
sudo systemctl enable mfrm-api
sudo systemctl start mfrm-api

# 상태 확인
sudo systemctl status mfrm-api
```

#### 9. 로그 확인
```bash
sudo journalctl -u mfrm-api -f
```

---

## 백엔드 배포 (Docker Compose)

### Docker 방식 (더 간단함)

#### 1. Docker 설치
```bash
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker opc
```

로그아웃 후 재접속

#### 2. Docker Compose 설치
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 3. 프로젝트 업로드 및 실행
```bash
cd ~/mfrm-backend
docker-compose up -d
```

#### 4. 로그 확인
```bash
docker-compose logs -f
```

---

## 배포 후 확인

### 1. 백엔드 Health Check

```bash
# 브라우저 또는 curl
curl http://<ORACLE_VM_IP>:8000/health

# 응답:
{
  "status": "ok",
  "service": "MFRM API",
  ...
}
```

### 2. 프론트엔드 확인

```
https://your-app.netlify.app
```

- ✅ 로그인 페이지 표시
- ✅ API 연결 확인 (로그인 시도)
- ✅ 브라우저 콘솔 에러 없음

### 3. 통합 테스트

1. **관리자 로그인**
   - 에세이 추가 테스트
   - 데이터베이스 저장 확인

2. **교사 로그인**
   - 에세이 채점 테스트
   - 채점 데이터 저장 확인

3. **MFRM 분석**
   - 충분한 데이터 입력 후
   - 분석 API 호출 테스트

---

## 유지보수

### 1. 업데이트 배포

#### 프론트엔드
```bash
git push origin main
# Netlify 자동 배포됨
```

#### 백엔드
```bash
# 로컬에서 변경 후
scp -i key.pem backend/*.R opc@<IP>:~/mfrm-backend/

# VM에서
sudo systemctl restart mfrm-api
```

### 2. 로그 모니터링

```bash
# 백엔드 로그
sudo journalctl -u mfrm-api --since "1 hour ago"

# Netlify 로그
Netlify Dashboard → Deploys → Function logs
```

### 3. 데이터베이스 백업

```bash
# Supabase Dashboard → Database → Backups
# 수동 백업 또는 자동 백업 확인
```

### 4. 성능 모니터링

**Supabase Dashboard → Reports**
- Database usage
- API calls
- Active connections

**Netlify Dashboard → Analytics**
- Page views
- Load time
- Bandwidth

---

## 🔐 보안 체크리스트

### 배포 전
- [ ] `.env` 파일이 Git에 커밋되지 않았는지 확인
- [ ] `service_role` 키는 백엔드에만 사용
- [ ] `anon` 키는 프론트엔드에만 사용
- [ ] Supabase RLS 정책 활성화 확인
- [ ] CORS 설정 확인 (ALLOWED_ORIGINS)

### 배포 후
- [ ] HTTPS 사용 (Netlify 자동, Oracle VM은 Let's Encrypt 권장)
- [ ] 백엔드 방화벽 설정 확인 (포트 8000만 열림)
- [ ] SSH는 특정 IP만 허용 권장
- [ ] 정기적인 보안 업데이트
- [ ] 로그 모니터링 설정

---

## 🚨 문제 해결

### 프론트엔드 빌드 실패
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 백엔드 API 연결 안됨
1. 방화벽 확인 (Oracle Cloud + VM 내부)
2. CORS 설정 확인
3. 환경 변수 확인 (`ALLOWED_ORIGINS`)

### 데이터베이스 연결 실패
1. Supabase 연결 정보 확인
2. 비밀번호 정확한지 확인
3. Supabase IP 제한 확인

---

## 💰 비용

### Free Tier 사용 시
- **Supabase**: $0 (Free tier)
  - 500 MB 데이터베이스
  - 1 GB 파일 스토리지
  - 50,000 monthly active users
  
- **Netlify**: $0 (Free tier)
  - 100 GB 대역폭/월
  - 300 빌드 분/월
  
- **Oracle Cloud**: $0 (Always Free)
  - VM.Standard.A1.Flex (4 OCPU, 24GB RAM)
  - 무기한 무료

**총 비용: $0/월** 🎉

### 트래픽 증가 시
- **Supabase Pro**: $25/월
- **Netlify Pro**: $19/월
- **Oracle Cloud**: 무료 유지 가능

---

## 📚 참고 자료

- **Netlify**: https://docs.netlify.com/
- **Oracle Cloud**: https://docs.oracle.com/en-us/iaas/
- **Supabase**: https://supabase.com/docs
- **Plumber**: https://www.rplumber.io/
- **Docker**: https://docs.docker.com/

---

**배포 성공하셨나요? 축하합니다!** 🚀  
문제가 있으면 SETUP_GUIDE.md의 문제 해결 섹션을 참고하세요.

