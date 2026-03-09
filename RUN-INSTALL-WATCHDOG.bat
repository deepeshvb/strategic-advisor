@echo off
title Watchdog Installer
cd /d "%~dp0"

REM Request admin so Register-ScheduledTask can create the task
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo This script must run as Administrator to create the scheduled task.
  echo Restarting with elevated rights...
  powershell -Command "Start-Process '%~f0' -Verb RunAs"
  exit /b
)

echo Running Watchdog installer (as Administrator)...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Watchdog.ps1"

echo.
echo.
pause
