@echo off
REM Temporarily disable backend autostart so you can do a clean restart (one backend only).
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP%\Strategic Advisor Backend.lnk"
set "DISABLED=%STARTUP%\Strategic Advisor Backend.lnk.disabled"

if exist "%DISABLED%" (
  echo Autostart is already disabled.
  pause
  exit /b 0
)
if not exist "%SHORTCUT%" (
  echo No autostart shortcut found. Nothing to disable.
  pause
  exit /b 0
)
ren "%SHORTCUT%" "Strategic Advisor Backend.lnk.disabled"
echo Autostart disabled. Backend will NOT start at next logon.
echo Run RESTART-BACKEND-AS-ADMIN.bat to get one backend on port 3000.
echo To re-enable later: run ENABLE-BACKEND-AUTOSTART.bat
pause
