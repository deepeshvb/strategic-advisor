@echo off
title Restart Strategic Advisor Backend
echo.
echo Restarting Strategic Advisor Backend (scheduled task)...
echo.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0RESTART-BACKEND-FOR-VOICE.ps1"
echo.
pause
