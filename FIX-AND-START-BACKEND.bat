@echo off
REM One-click fix: disable autostart, free all ports, start ONE backend on 3000.
REM Right-click this file -> Run as administrator
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo Run as Administrator: Right-click FIX-AND-START-BACKEND.bat -^> "Run as administrator"
  pause
  exit /b 1
)

cd /d "%~dp0"
title Fix and Start Backend

echo ============================================
echo  FIX AND START BACKEND (one instance only)
echo ============================================
echo.

REM 1. Disable autostart so nothing respawns while we fix
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP%\Strategic Advisor Backend.lnk"
set "DISABLED=%STARTUP%\Strategic Advisor Backend.lnk.disabled"
if exist "%SHORTCUT%" (
  ren "%SHORTCUT%" "Strategic Advisor Backend.lnk.disabled" 2>nul
  echo [1/3] Autostart disabled for this session.
) else (
  echo [1/3] Autostart already disabled or not installed.
)
echo.

REM 2. Free ports 3000-3005 (kill all node, retry if needed)
echo [2/3] Freeing ports 3000-3005...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Kill-Backend-Ports.ps1"
if %ERRORLEVEL% neq 0 (
  echo Retrying: killing node again and waiting 5 sec...
  powershell -NoProfile -Command "Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force; cmd /c 'taskkill /IM node.exe /F 2>nul'; Start-Sleep -Seconds 5"
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Kill-Backend-Ports.ps1"
)
if %ERRORLEVEL% neq 0 (
  echo.
  echo Ports could not be freed. Close any app using 3000-3005, then run this script again.
  pause
  exit /b 1
)
echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul
echo.

REM 3. Start one backend (no "agent is up" WhatsApp when started by this script)
set SKIP_STARTUP_WHATSAPP=1
echo [3/3] Starting Strategic Advisor Backend...
start "Strategic Advisor Backend" cmd /k "cd /d "%~dp0" && set SKIP_STARTUP_WHATSAPP=1 && node backend\server.js"
echo.
echo Done. The backend window should show "running on port 3000".
echo To get autostart back at logon: run ENABLE-BACKEND-AUTOSTART.bat
echo.
pause
