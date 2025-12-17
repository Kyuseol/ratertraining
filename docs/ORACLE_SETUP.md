# Oracle Cloud 설정 가이드

Oracle Cloud Always Free Tier를 활용한 R 백엔드 배포 가이드입니다.

---

## 📋 목차

1. [Oracle Cloud 가입](#1-oracle-cloud-가입)
2. [VM 인스턴스 생성](#2-vm-인스턴스-생성)
3. [네트워크 및 방화벽 설정](#3-네트워크-및-방화벽-설정)
4. [Docker 설치](#4-docker-설치)
5. [R 백엔드 배포](#5-r-백엔드-배포)
6. [모니터링 및 관리](#6-모니터링-및-관리)

---

## 1. Oracle Cloud 가입

### 1.1 계정 생성

1. **웹사이트 방문**
   - https://www.oracle.com/cloud/free/

2. **"Start for free" 클릭**

3. **기본 정보 입력**
   ```
   Country/Territory: South Korea
   Email Address: your-email@example.com
   First Name / Last Name: 이름
   Company Name: 개인 또는 회사명
   ```

4. **이메일 인증**
   - 받은 이메일에서 "Verify email" 클릭

5. **계정 정보 입력**
   ```
   Cloud Account Name: 고유한 이름 (변경 불가)
   Home Region: South Korea Central (Seoul)
   ```

6. **신용카드 등록** ⚠️
   - **반드시 필요** (인증용)
   - **Always Free 리소스는 절대 과금되지 않음**
   - 유효한 신용카드/체크카드 등록
   - $1 인증 후 즉시 환불

7. **계정 활성화 대기**
   - 약 5-10분 소요
   - 이메일로 활성화 알림 수신

---

## 2. VM 인스턴스 생성

### 2.1 Console 접속

1. Oracle Cloud 로그인
2. 좌측 메뉴 → **Compute** → **Instances**

### 2.2 인스턴스 생성

1. **"Create Instance" 클릭**

2. **Name and placement**
   ```
   Name: mfrm-r-backend
   Compartment: (root) 또는 원하는 compartment
   Availability domain: 기본값 (AD-1)
   ```

3. **Image and shape** ⭐ 중요!

   **Image 선택:**
   - "Change Image" 클릭
   - **Oracle Linux 8** 선택 (기본값)
   - "Select image" 클릭

   **Shape 선택:**
   - "Change Shape" 클릭
   - ⚠️ **반드시 "Ampere"** 선택 (ARM 프로세서)
   - **VM.Standard.A1.Flex** 선택 ⭐ (Always Free!)
   
   ```
   OCPU count: 4 (최대값)
   Memory (GB): 24 (최대값)
   ```
   
   - "Select shape" 클릭

   > 💡 **중요:** Intel/AMD 기반 Shape는 유료입니다!

4. **Networking**

   **Primary VNIC information:**
   - "Create new virtual cloud network" 선택 (처음 생성 시)
   - 또는 기존 VCN 선택
   
   ```
   VCN name: vcn-mfrm
   Subnet name: subnet-public
   ```
   
   - ✅ **"Assign a public IPv4 address"** 체크 (필수!)

5. **Add SSH keys** 🔑

   **Option A: 자동 생성 (권장)**
   - "Generate a key pair for me" 선택
   - **"Save Private Key"** 클릭 → `.pem` 파일 다운로드
   - **"Save Public Key"** 클릭 → `.pub` 파일 다운로드
   - ⚠️ **Private key를 안전한 곳에 보관!** (재다운로드 불가)

   **Option B: 기존 키 사용**
   - "Upload public key files (.pub)" 선택
   - 본인의 `~/.ssh/id_rsa.pub` 파일 업로드

6. **Boot volume**
   - 기본값 유지 (50GB)

7. **Create 클릭**
   - ⏱️ 약 1-2분 소요
   - 상태가 "Provisioning" → "Running"으로 변경

### 2.3 인스턴스 정보 확인

생성 완료 후:

```
Public IP address: xxx.xxx.xxx.xxx (메모!)
Private IP address: 10.0.0.x
Username: opc (Oracle Linux 기본 사용자)
```

---

## 3. 네트워크 및 방화벽 설정

### 3.1 Security List 설정

1. **인스턴스 상세 페이지** → **Primary VNIC** 섹션
2. **Subnet** 링크 클릭
3. **Security Lists** → Default Security List 클릭
4. **"Add Ingress Rules"** 클릭

**Rule 1: SSH (이미 설정되어 있음)**
```
Source CIDR: 0.0.0.0/0
IP Protocol: TCP
Destination Port Range: 22
Description: SSH access
```

**Rule 2: R Plumber API** ⭐
```
Source CIDR: 0.0.0.0/0
IP Protocol: TCP
Destination Port Range: 8000
Description: R Plumber API
```

5. **"Add Ingress Rules"** 클릭

### 3.2 VM 내부 방화벽 설정

SSH로 접속한 후:

```bash
# 포트 8000 열기
sudo firewall-cmd --permanent --add-port=8000/tcp

# 방화벽 재시작
sudo firewall-cmd --reload

# 확인
sudo firewall-cmd --list-all
```

출력 예시:
```
public (active)
  target: default
  ports: 8000/tcp
  ...
```

---

## 4. Docker 설치

### 4.1 SSH 접속

**Windows (PowerShell):**
```powershell
ssh -i C:\path\to\your-key.pem opc@xxx.xxx.xxx.xxx
```

**Mac/Linux:**
```bash
chmod 400 ~/path/to/your-key.pem
ssh -i ~/path/to/your-key.pem opc@xxx.xxx.xxx.xxx
```

### 4.2 Docker 설치

```bash
# Docker 설치
sudo yum install -y docker

# Docker 시작
sudo systemctl start docker
sudo systemctl enable docker

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker opc

# 로그아웃 후 재로그인 (권한 적용)
exit
# 다시 SSH 접속
```

### 4.3 Docker Compose 설치

```bash
# Docker Compose 다운로드
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose

# 실행 권한 부여
sudo chmod +x /usr/local/bin/docker-compose

# 심볼릭 링크 생성
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# 버전 확인
docker --version
docker-compose --version
```

출력 예시:
```
Docker version 24.0.x
Docker Compose version v2.xx.x
```

---

## 5. R 백엔드 배포

### 5.1 프로젝트 파일 업로드

**로컬 컴퓨터에서:**

```bash
# backend 디렉토리를 VM에 업로드
scp -i your-key.pem -r backend/ opc@xxx.xxx.xxx.xxx:~/mfrm-backend/
```

**또는 Git 사용:**

```bash
# VM에서
cd ~
git clone https://github.com/your-username/mfrm-rater-training.git
cd mfrm-rater-training/backend
```

### 5.2 환경 변수 설정

```bash
cd ~/mfrm-backend

# .env 파일 생성
cp .env.example .env

# 환경 변수 편집
nano .env
```

`.env` 내용:
```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-service-role-key
SUPABASE_DB_HOST=db.your-project-id.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-database-password

API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:3000,https://your-app.netlify.app
```

저장: `Ctrl+X` → `Y` → `Enter`

### 5.3 Docker 컨테이너 실행

```bash
# Docker Compose로 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 컨테이너 상태 확인
docker ps
```

### 5.4 API 테스트

```bash
# 헬스 체크
curl http://localhost:8000/health

# 외부에서 접근 테스트 (로컬 컴퓨터에서)
curl http://xxx.xxx.xxx.xxx:8000/health
```

성공 응답:
```json
{
  "status": "ok",
  "service": "MFRM API",
  "version": "1.0.0",
  ...
}
```

---

## 6. 모니터링 및 관리

### 6.1 Docker 컨테이너 관리

```bash
# 컨테이너 시작
docker-compose up -d

# 컨테이너 중지
docker-compose down

# 컨테이너 재시작
docker-compose restart

# 로그 실시간 보기
docker-compose logs -f

# 로그 마지막 100줄
docker-compose logs --tail=100
```

### 6.2 시스템 리소스 모니터링

```bash
# 메모리 사용량
free -h

# CPU 사용량
top

# 디스크 사용량
df -h

# Docker 리소스
docker stats
```

### 6.3 자동 재시작 설정

`docker-compose.yml`에 추가:
```yaml
services:
  mfrm-api:
    restart: always  # 시스템 재부팅 시 자동 시작
```

### 6.4 로그 로테이션

```bash
# /etc/docker/daemon.json 편집
sudo nano /etc/docker/daemon.json
```

내용:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Docker 재시작:
```bash
sudo systemctl restart docker
docker-compose up -d
```

---

## 7. 보안 강화

### 7.1 SSH 키 인증만 허용

```bash
sudo nano /etc/ssh/sshd_config
```

변경:
```
PasswordAuthentication no
PubkeyAuthentication yes
```

재시작:
```bash
sudo systemctl restart sshd
```

### 7.2 Fail2Ban 설치 (브루트포스 공격 방어)

```bash
sudo yum install -y epel-release
sudo yum install -y fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 7.3 자동 업데이트 설정

```bash
sudo yum install -y yum-cron
sudo systemctl start yum-cron
sudo systemctl enable yum-cron
```

---

## 8. 문제 해결

### 8.1 포트 8000에 접근 안됨

**확인 사항:**
1. Security List에 Ingress Rule 추가했는지
2. VM 내부 방화벽에서 포트 열었는지:
   ```bash
   sudo firewall-cmd --list-all
   ```
3. Docker 컨테이너가 실행 중인지:
   ```bash
   docker ps
   ```

### 8.2 Docker 빌드 실패

```bash
# 로그 확인
docker-compose logs

# 컨테이너 재빌드
docker-compose build --no-cache
docker-compose up -d
```

### 8.3 Out of Memory 에러

```bash
# 스왑 메모리 추가 (4GB)
sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 9. Always Free 리소스 확인

### 9.1 Always Free 여부 확인

Console → Compute → Instances → Instance Details

Shape 옆에 **"Always Free-eligible"** 표시 확인!

### 9.2 과금 방지

- ⚠️ Shape를 변경하면 유료로 전환될 수 있음
- VM을 삭제하고 재생성해도 Always Free 유지
- 월별 청구서에서 "Always Free" 표시 확인

---

## 📚 참고 자료

- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [Oracle Linux 문서](https://docs.oracle.com/en/operating-systems/oracle-linux/)
- [Docker 문서](https://docs.docker.com/)

---

**마지막 업데이트:** 2025-11-15
**문서 버전:** 1.0

