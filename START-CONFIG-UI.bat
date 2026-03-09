@echo off
title Config UI - Strategic Advisor
echo ========================================
echo   STRATEGIC AI ADVISOR - CONFIG UI
echo ========================================
echo.
echo Starting Vite dev server...
echo Backend API: http://localhost:3000
echo Frontend UI: http://localhost:5173
echo.
echo Opening browser in a few seconds...
echo Press Ctrl+C to stop the server.
echo.

cd /d "%~dp0"
REM Open browser after 6 sec (give Vite time to start)
start /B cmd /c "timeout /t 6 /nobreak >nul && start http://localhost:5173"
npm run dev
