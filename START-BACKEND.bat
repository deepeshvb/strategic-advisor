@echo off
REM Use this after every reboot. Right-click -> Run as administrator.
REM Re-launch in a "keep open" window so you always see the result
if "%~1"=="" (
  start "Strategic Advisor - Backend Launcher" cmd /k "%~f0" keepopen
  exit /b 0
)

title Strategic Advisor - Backend Launcher
cd /d "%~dp0"

echo.
echo  ==========================================
echo   START STRATEGIC ADVISOR BACKEND
echo  ==========================================
echo.

net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo  [X] Not running as Administrator.
  echo  Right-click START-BACKEND.bat -^> Run as administrator
  echo.
  goto stayopen
)

echo  [0] Running as Administrator... OK
echo.

REM Disable autostart so we only get one backend
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if exist "%STARTUP%\Strategic Advisor Backend.lnk" (
  ren "%STARTUP%\Strategic Advisor Backend.lnk" "Strategic Advisor Backend.lnk.disabled" 2>nul
)

REM Stop and disable BOTH tasks so nothing restarts Node (Backend + Watchdog)
schtasks /End /TN "StrategicAdvisorBackend" /F >nul 2>&1
schtasks /Change /TN "StrategicAdvisorBackend" /DISABLE >nul 2>&1
schtasks /End /TN "StrategicAdvisorWatchdog" /F >nul 2>&1
schtasks /Change /TN "StrategicAdvisorWatchdog" /DISABLE >nul 2>&1
taskkill /IM wscript.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul

echo  [1] Freeing ports 3000-3005...
REM Kill whatever is on these ports by PID (handles node, wscript, or daemon cmd)
powershell -NoProfile -Command "3000..3005 | ForEach-Object { Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue } | ForEach-Object { if ($_.OwningProcess -gt 0) { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }; Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"
taskkill /IM node.exe /F >nul 2>&1
taskkill /IM wscript.exe /F >nul 2>&1
timeout /t 3 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Kill-Backend-Ports.ps1"
if %ERRORLEVEL% neq 0 (
  echo  Retrying ^(full kill + 10 sec wait^)...
  taskkill /IM node.exe /F >nul 2>&1
  taskkill /IM wscript.exe /F >nul 2>&1
  timeout /t 10 /nobreak >nul
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Kill-Backend-Ports.ps1"
)
if %ERRORLEVEL% neq 0 (
  echo.
  echo  [X] Ports still in use. Restart the PC, then run this script again as administrator.
  echo.
  goto stayopen
)

timeout /t 3 /nobreak >nul
echo  [2] Checking port 3000 is free...
set RETRIES=0
:checkport
REM Only treat as "in use" if something is LISTENing; ignore TIME_WAIT/Established from just-killed process
powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($c) { exit 1 } else { exit 0 }"
if %ERRORLEVEL% equ 0 goto portfree
set /a RETRIES+=1
if %RETRIES% gtr 5 goto portfail
echo  Port 3000 in use ^(try %RETRIES%/5^). Killing process on 3000...
schtasks /End /TN "StrategicAdvisorBackend" /F >nul 2>&1
schtasks /End /TN "StrategicAdvisorWatchdog" /F >nul 2>&1
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { if ($_.OwningProcess -gt 0) { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }; Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force"
taskkill /IM node.exe /F >nul 2>&1
taskkill /IM wscript.exe /F >nul 2>&1
timeout /t 5 /nobreak >nul
goto checkport
:portfail
echo.
echo  [X] Could not free port 3000 after 5 tries.
echo  Restart the PC, then run this script again as administrator.
echo.
goto stayopen
:portfree
echo  [2] Port 3000 is free.
echo.
echo  [3] Starting backend (new window)...
schtasks /End /TN "StrategicAdvisorBackend" /F >nul 2>&1
schtasks /End /TN "StrategicAdvisorWatchdog" /F >nul 2>&1
set SKIP_STARTUP_WHATSAPP=1
start "Strategic Advisor Backend" cmd /k "cd /d "%~dp0" && set SKIP_STARTUP_WHATSAPP=1 && node backend\server.js & echo. & echo Backend stopped. Press any key to close this window. & pause >nul"
echo.
echo  Waiting 5 sec to verify backend started...
timeout /t 5 /nobreak >nul
powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($c) { exit 0 } else { exit 1 }"
if %ERRORLEVEL% equ 0 (
  echo  [OK] Backend is RUNNING on port 3000.
  echo  A second window is open with the server log. Keep that window open.
) else (
  echo  [!!] Backend may not have started. Check the other window for errors.
)
echo.
:stayopen
echo  -------------------------------------------
echo  Press any key to close this window.
pause >nul
exit /b 0
