# MFRM 프론트엔드 실행 스크립트
# PowerShell 스크립트

Write-Host "================================" -ForegroundColor Cyan
Write-Host " MFRM Frontend 시작" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Node.js 버전 확인
Write-Host "Node.js 버전 확인..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green

# npm 버전 확인
$npmVersion = npm --version
Write-Host "  npm: $npmVersion`n" -ForegroundColor Green

# React 앱 실행
Write-Host "React 앱 실행 중..." -ForegroundColor Yellow
Write-Host "  포트: 3000" -ForegroundColor Green
Write-Host "  URL: http://localhost:3000`n" -ForegroundColor Green

Write-Host "브라우저가 자동으로 열립니다..." -ForegroundColor Cyan
Write-Host "종료하려면 Ctrl+C를 누르세요.`n" -ForegroundColor Cyan

# npm start 실행
npm start

