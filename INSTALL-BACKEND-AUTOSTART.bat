@echo off
title Install Backend Auto-Start
cd /d "%~dp0"

echo ========================================
echo   BACKEND AUTO-START (Agent 24/7)
echo ========================================
echo.
echo This will start the Strategic Advisor BACKEND automatically
echo when you log in to Windows. The agent will be ready for
echo WhatsApp, email, and briefings without running any script.
echo.
echo You will see a minimized window when the backend is running.
echo.
pause

set "SCRIPT_DIR=%~dp0"
set "VBS_PATH=%SCRIPT_DIR%run-backend-at-logon.vbs"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\Strategic Advisor Backend.lnk"

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%VBS_PATH%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.WindowStyle = 7; $s.Description = 'Strategic Advisor Backend - starts at logon'; $s.Save()"

echo.
echo Backend auto-start is installed.
echo.
echo After you reboot or log in, the backend will start automatically
echo (minimized). You can send WhatsApp/email questions anytime.
echo.
echo To remove auto-start:
echo   Win+R, type: shell:startup, then delete "Strategic Advisor Backend"
echo.
pause
