@echo off
title Strategic Advisor - Config Dashboard
cd /d "%~dp0"

echo ============================================
echo  STRATEGIC ADVISOR - CONFIG DASHBOARD
echo ============================================
echo.

REM Start backend in a new window (if not already running)
echo Starting backend (port 3000)...
start "Strategic Advisor Backend" cmd /k "cd /d "%~dp0" && node backend\server.js"
timeout /t 2 /nobreak >nul

REM Start frontend (Vite) in a new window
echo Starting frontend (port 5173)...
start "Strategic Advisor Frontend" cmd /k "cd /d "%~dp0" && npm run dev"
echo.
echo Waiting for app to be ready...
timeout /t 8 /nobreak >nul

REM Open config dashboard in default browser
echo Opening Configuration Dashboard...
start "" "http://localhost:5173"
echo.
echo Dashboard should open in your browser.
echo Keep the Backend and Frontend windows open while using the app.
echo.
pause
