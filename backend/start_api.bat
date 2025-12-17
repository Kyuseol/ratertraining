@echo off
REM MFRM 백엔드 API 실행 스크립트 (CMD용)

echo ================================
echo  MFRM Backend API 시작
echo ================================
echo.

REM R PATH 설정
set PATH=%PATH%;C:\Program Files\R\R-4.2.3\bin\x64

echo R 버전 확인...
Rscript --version
echo.

echo API 서버 실행 중...
echo   포트: 8000
echo   URL: http://localhost:8000
echo.
echo 종료하려면 Ctrl+C를 누르세요.
echo.

REM Plumber API 실행
Rscript -e "pr <- plumber::plumb('fluber.R'); pr$run(host='0.0.0.0', port=8000)"

