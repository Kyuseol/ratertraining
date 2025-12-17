# MFRM 백엔드 API 실행 스크립트
# PowerShell 스크립트

Write-Host "================================" -ForegroundColor Cyan
Write-Host " MFRM Backend API 시작" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# R PATH 설정
Write-Host "R PATH 설정 중..." -ForegroundColor Yellow
$env:Path += ";C:\Program Files\R\R-4.2.3\bin\x64"

# R 버전 확인
Write-Host "R 버전 확인..." -ForegroundColor Yellow
$rVersion = Rscript --version 2>&1 | Select-Object -First 1
Write-Host "  $rVersion`n" -ForegroundColor Green

# API 서버 실행
Write-Host "API 서버 실행 중..." -ForegroundColor Yellow
Write-Host "  포트: 8000" -ForegroundColor Green
Write-Host "  URL: http://localhost:8000`n" -ForegroundColor Green

Write-Host "종료하려면 Ctrl+C를 누르세요.`n" -ForegroundColor Cyan

# Plumber API 실행
Rscript -e "pr <- plumber::plumb('fluber.R'); pr`$run(host='0.0.0.0', port=8000)"

