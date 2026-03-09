@echo off
REM Re-enable backend autostart (after you disabled it with DISABLE-BACKEND-AUTOSTART.bat).
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP%\Strategic Advisor Backend.lnk"
set "DISABLED=%STARTUP%\Strategic Advisor Backend.lnk.disabled"

if not exist "%DISABLED%" (
  echo No disabled shortcut found. Run INSTALL-BACKEND-AUTOSTART.bat to install autostart.
  pause
  exit /b 0
)
ren "%DISABLED%" "Strategic Advisor Backend.lnk"
echo Autostart re-enabled. Backend will start at next logon (only if port 3000 is free).
pause
