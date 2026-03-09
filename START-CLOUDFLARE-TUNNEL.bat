@echo off
echo ============================================
echo  Cloudflare Tunnel - webhook.lobstermoltys.com
echo ============================================
echo.
echo Permanent URL: https://webhook.lobstermoltys.com/webhook/whatsapp
echo.
echo Prerequisites: Backend must be running (START-BACKEND.bat)
echo.
echo Starting tunnel...
cd /d "%~dp0"
cloudflared tunnel run strategic-advisor
echo.
echo Tunnel stopped. Press any key to close.
pause
