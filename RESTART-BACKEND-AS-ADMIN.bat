@echo off
REM Request admin, then run the same kill + start as RESTART-BACKEND-ONLY.bat
net session >nul 2>&1
if %ERRORLEVEL% equ 0 goto :run
echo Requesting Administrator rights to free ports...
powershell -Command "Start-Process '%~f0' -Verb RunAs"
exit /b

:run
cd /d "%~dp0"
title Restart Backend (Admin)

echo ============================================
echo  RESTART BACKEND (running as Administrator)
echo ============================================
echo.

echo Freeing ports 3000-3005...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Kill-Backend-Ports.ps1"
if %ERRORLEVEL% neq 0 (
  echo Ports still in use. Check for other apps using 3000-3005.
  pause
  exit /b 1
)

echo Waiting 3 seconds...
timeout /t 3 /nobreak >nul
echo.

echo Starting Strategic Advisor Backend...
set SKIP_STARTUP_WHATSAPP=1
start "Strategic Advisor Backend" cmd /k "cd /d "%~dp0" && set SKIP_STARTUP_WHATSAPP=1 && node backend\server.js"
echo.
echo Backend started. Should show "running on port 3000".
pause
