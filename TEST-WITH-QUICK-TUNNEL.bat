@echo off
echo ============================================
echo  Test WhatsApp with Cloudflare Quick Tunnel
echo ============================================
echo.
echo This will:
echo 1. Stop the tunnel service
echo 2. Start a quick tunnel (temporary URL)
echo 3. Show you the URL to put in Twilio
echo.
echo Run as Administrator (right-click ^> Run as administrator)
echo.
pause

net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Run as Administrator!
    pause
    exit /b 1
)

echo Stopping tunnel service...
net stop cloudflared 2>nul
taskkill /f /im cloudflared.exe 2>nul
timeout /t 3 /nobreak >nul

echo.
echo Starting quick tunnel to http://localhost:3000
echo.
echo IMPORTANT: Copy the HTTPS URL shown below.
echo Put it in Twilio: https://YOUR-URL/webhook/whatsapp
echo.
echo Leave this window open. Press Ctrl+C to stop.
echo.
cd /d "%~dp0"
cloudflared tunnel --url http://localhost:3000
