@echo off
echo ========================================
echo   STRATEGIC ADVISOR - 24/7 DEPLOYMENT
echo ========================================
echo.
echo This will install:
echo   1. Backend as Windows service (always running)
echo   2. Cloudflare tunnel service (permanent webhook URL)
echo   3. Watchdog (restarts services on network disconnect/reconnect)
echo.
echo REQUIREMENTS:
echo   - Run as Administrator (right-click ^> Run as administrator)
echo   - .env.backend configured with Twilio credentials
echo   - Cloudflare tunnel already set up (run Install-TunnelService.ps1 first)
echo.
pause

REM Check for admin
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Must run as Administrator!
    echo Right-click this file and select "Run as administrator"
    pause
    exit /b 1
)

REM Check .env.backend
if not exist ".env.backend" (
    echo ERROR: .env.backend not found!
    echo Configure Twilio credentials first. See TWILIO-SETUP-GUIDE.md
    pause
    exit /b 1
)

echo.
echo [1/3] Installing backend as Windows service...
powershell -ExecutionPolicy Bypass -File "%~dp0Install-BackendService.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo Backend service install failed.
    pause
    exit /b 1
)

echo.
echo [2/3] Verifying tunnel service...
sc query cloudflared >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Cloudflare tunnel not installed.
    echo Run Install-TunnelService.ps1 as Administrator first.
    echo.
) else (
    sc config cloudflared start= auto
    net start cloudflared
    echo Tunnel service configured for auto-start.
)

echo.
echo [3/3] Installing watchdog (network monitor)...
powershell -ExecutionPolicy Bypass -File "%~dp0Install-Watchdog.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo Watchdog install failed.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   DEPLOYMENT COMPLETE
echo ========================================
echo.
echo Your Strategic Advisor is now running 24/7:
echo   - Backend: Windows service (auto-start)
echo   - Tunnel: https://webhook.lobstermoltys.com
echo   - Watchdog: Restarts on network disconnect/reconnect
echo.
echo WhatsApp webhook URL for Twilio:
echo   https://webhook.lobstermoltys.com/webhook/whatsapp
echo.
echo Logs: %~dp0logs\
echo.
pause
