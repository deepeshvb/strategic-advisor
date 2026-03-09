@echo off
title Restart Strategic Advisor Backend (port 3000)
cd /d "%~dp0"

echo ============================================
echo  RESTART BACKEND ONLY (port 3000)
echo ============================================
echo.

echo Freeing ports 3000-3005...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Kill-Backend-Ports.ps1"
if %ERRORLEVEL% neq 0 (
  echo.
  echo Ports could not be freed. Run this script as Administrator:
  echo   Right-click this file, then choose "Run as administrator"
  echo.
  pause
  exit /b 1
)

echo Waiting 3 seconds for ports to be released...
timeout /t 3 /nobreak >nul
echo.

echo Starting Strategic Advisor Backend...
set SKIP_STARTUP_WHATSAPP=1
start "Strategic Advisor Backend" cmd /k "cd /d "%~dp0" && set SKIP_STARTUP_WHATSAPP=1 && node backend\server.js"
echo.
echo Backend window opened. Keep it open. Should show "running on port 3000".
echo Config UI: run START-CONFIG-UI.bat, then open http://localhost:5173
echo.
pause
