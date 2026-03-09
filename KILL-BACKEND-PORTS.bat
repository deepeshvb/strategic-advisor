@echo off
title Kill all processes on ports 3000-3005
cd /d "%~dp0"

echo Killing any process on ports 3000-3005...
echo.

REM Use PowerShell to find and kill by port (reliable on all Windows)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Kill-Backend-Ports.ps1"

echo.
echo Waiting 3 seconds for ports to be released...
timeout /t 3 /nobreak >nul
echo Done. Now run RESTART-BACKEND-ONLY.bat or start the backend manually.
pause
