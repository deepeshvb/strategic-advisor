@echo off
REM Starts the Strategic Advisor backend (minimized). Used by autostart at logon.
REM Only starts if port 3000 is FREE - never starts a second backend.
cd /d "%~dp0"

REM If something is already listening on 3000, backend is already running - do nothing
powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($c) { exit 1 } else { exit 0 }"
if %ERRORLEVEL% equ 1 (
  REM Backend already running on 3000 - exit quietly
  exit /b 0
)

REM Port 3000 is free: free any stale processes on 3000-3005, then start one backend
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Kill-Backend-Ports.ps1" 2>nul
timeout /t 2 /nobreak >nul

REM Start without sending "agent is up" WhatsApp (avoids message every time you log in)
start /min "Strategic Advisor Backend" cmd /c "cd /d "%~dp0" && set SKIP_STARTUP_WHATSAPP=1 && node backend\server.js"
