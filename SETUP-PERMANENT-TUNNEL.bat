@echo off
echo ============================================
echo  Permanent Cloudflare Tunnel Setup
echo ============================================
echo.
echo This creates a FIXED URL for Twilio - no more changing it!
echo.
echo REQUIREMENT: You need a domain in your Cloudflare account.
echo   - Add at: https://dash.cloudflare.com (free)
echo   - Or buy at-cloudflare pricing: ~$10/year
echo.
pause

cd /d "%~dp0"

echo.
echo Step 1: Login to Cloudflare...
cloudflared tunnel login
if %ERRORLEVEL% NEQ 0 (
    echo Login failed
    pause
    exit /b 1
)

echo.
echo Step 2: Creating tunnel 'strategic-advisor'...
cloudflared tunnel create strategic-advisor
if %ERRORLEVEL% NEQ 0 (
    echo Create failed. Tunnel may already exist.
)
echo.

echo Step 3: Get your tunnel ID...
for /f "tokens=1" %%i in ('cloudflared tunnel list ^| findstr "strategic-advisor"') do set TUNNEL_ID=%%i
echo Tunnel ID: %TUNNEL_ID%
echo.

if "%TUNNEL_ID%"=="" (
    echo Could not find tunnel ID. Run: cloudflared tunnel list
    pause
    exit /b 1
)

echo Step 4: Creating config...
mkdir "%USERPROFILE%\.cloudflared" 2>nul
(
echo url: http://localhost:3000
echo tunnel: %TUNNEL_ID%
echo credentials-file: %USERPROFILE%\.cloudflared\%TUNNEL_ID%.json
) > "%USERPROFILE%\.cloudflared\config.yml"
echo Config saved to %USERPROFILE%\.cloudflared\config.yml
echo.

echo Step 5: Route DNS - ENTER YOUR SUBDOMAIN
echo Example: webhook.yourdomain.com
echo.
set /p HOSTNAME="Enter hostname (e.g. webhook.yourdomain.com): "

cloudflared tunnel route dns strategic-advisor %HOSTNAME%
if %ERRORLEVEL% NEQ 0 (
    echo Route failed. Make sure %HOSTNAME% is in your Cloudflare account.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  SUCCESS! Your permanent URL:
echo  https://%HOSTNAME%/webhook/whatsapp
echo ============================================
echo.
echo Configure Twilio with:
echo   https://%HOSTNAME%/webhook/whatsapp
echo.
echo Start tunnel: cloudflared tunnel run strategic-advisor
echo.
pause
