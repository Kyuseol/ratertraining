@echo off
REM MFRM 프론트엔드 실행 스크립트 (CMD용)

echo ================================
echo  MFRM Frontend 시작
echo ================================
echo.

echo Node.js 버전 확인...
node --version
npm --version
echo.

echo React 앱 실행 중...
echo   포트: 3000
echo   URL: http://localhost:3000
echo.
echo 브라우저가 자동으로 열립니다...
echo 종료하려면 Ctrl+C를 누르세요.
echo.

REM npm start 실행
npm start

