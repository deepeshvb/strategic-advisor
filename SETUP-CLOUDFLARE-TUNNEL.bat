@echo off
echo ============================================
echo  Cloudflare Tunnel Setup - Remote Access
echo ============================================
echo.
echo This will enable global access to your Strategic Advisor
echo from ANY WiFi or cellular connection.
echo.
echo Prerequisites:
echo 1. Free Cloudflare account (signup at cloudflare.com)
echo 2. Your laptop server running (localhost:5173)
echo.
pause
echo.

echo Step 1: Downloading Cloudflare Tunnel (cloudflared)...
echo.
curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -o "%TEMP%\cloudflared.exe"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to download cloudflared
    pause
    exit /b 1
)

echo ✅ Downloaded successfully
echo.

echo Step 2: Installing cloudflared...
move "%TEMP%\cloudflared.exe" "%SystemRoot%\System32\cloudflared.exe"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Installation failed. You may need to run as Administrator.
    echo.
    echo Right-click this file and select "Run as administrator"
    pause
    exit /b 1
)

echo ✅ Installed to System32
echo.

echo Step 3: Verifying installation...
cloudflared --version
echo.

echo Step 4: Login to Cloudflare (browser will open)...
echo.
echo IMPORTANT: 
echo - If you don't have a Cloudflare account, sign up for FREE
echo - Select ANY domain (or skip if you don't have one)
echo - This is completely free, no credit card required
echo.
pause

cloudflared tunnel login

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Login failed
    pause
    exit /b 1
)

echo ✅ Logged in successfully
echo.

echo Step 5: Creating tunnel...
echo.
set TUNNEL_NAME=strategic-advisor-%RANDOM%
echo Creating tunnel: %TUNNEL_NAME%
echo.

cloudflared tunnel create %TUNNEL_NAME%

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create tunnel
    pause
    exit /b 1
)

echo ✅ Tunnel created
echo.

echo Step 6: Getting tunnel information...
cloudflared tunnel list > "%TEMP%\tunnel-info.txt"
type "%TEMP%\tunnel-info.txt"
echo.

echo Step 7: Extracting tunnel ID...
for /f "tokens=1" %%i in ('cloudflared tunnel list ^| findstr /C:"%TUNNEL_NAME%"') do set TUNNEL_ID=%%i
echo Tunnel ID: %TUNNEL_ID%
echo.

if "%TUNNEL_ID%"=="" (
    echo ERROR: Could not find tunnel ID
    echo Please check the output above and note your tunnel ID manually
    pause
    exit /b 1
)

echo Step 8: Creating configuration file...
mkdir "%USERPROFILE%\.cloudflared" 2>nul

(
echo tunnel: %TUNNEL_ID%
echo credentials-file: %USERPROFILE%\.cloudflared\%TUNNEL_ID%.json
echo.
echo ingress:
echo   - service: http://localhost:5173
) > "%USERPROFILE%\.cloudflared\config.yml"

echo ✅ Configuration saved
echo.

echo Step 9: Starting tunnel (testing)...
echo.
echo Opening tunnel... This will show your public URL.
echo Leave this window open!
echo.
start "Cloudflare Tunnel" cloudflared tunnel run %TUNNEL_NAME%
timeout /t 10
echo.

echo Step 10: Getting your public URL...
echo.
cloudflared tunnel info %TUNNEL_NAME%
echo.

echo ============================================
echo  ✅ TUNNEL IS RUNNING!
echo ============================================
echo.
echo Your Strategic Advisor is now accessible at:
echo.
echo   https://%TUNNEL_ID%.cfargotunnel.com
echo.
echo IMPORTANT: Save this URL!
echo.
echo Next steps:
echo 1. Open this URL on your mobile (any WiFi/cellular)
echo 2. Login and add to home screen
echo 3. Configure Siri shortcuts with this URL
echo.
echo To make tunnel auto-start with Windows:
echo   cloudflared service install
echo.
echo To stop tunnel:
echo   Close the "Cloudflare Tunnel" window
echo.
pause

echo.
echo Would you like to install tunnel as a Windows service? (Y/N)
set /p INSTALL_SERVICE="Auto-start with Windows: "

if /i "%INSTALL_SERVICE%"=="Y" (
    echo.
    echo Installing as Windows service...
    cloudflared service install
    echo.
    echo ✅ Tunnel will now start automatically with Windows!
    echo.
    net start cloudflared
    echo.
    echo Service status:
    sc query cloudflared
)

echo.
echo ============================================
echo  SETUP COMPLETE!
echo ============================================
echo.
echo Public URL: https://%TUNNEL_ID%.cfargotunnel.com
echo.
echo Save this information:
(
echo Tunnel Name: %TUNNEL_NAME%
echo Tunnel ID: %TUNNEL_ID%
echo Public URL: https://%TUNNEL_ID%.cfargotunnel.com
echo Config File: %USERPROFILE%\.cloudflared\config.yml
echo Local Service: http://localhost:5173
) > "%USERPROFILE%\Desktop\Strategic-Advisor-URL.txt"

echo.
echo ✅ URL saved to your Desktop: Strategic-Advisor-URL.txt
echo.
pause
