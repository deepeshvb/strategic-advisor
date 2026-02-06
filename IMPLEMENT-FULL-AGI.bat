@echo off
echo ============================================
echo  FULL AGI IMPLEMENTATION - Remote + Voice
echo ============================================
echo.

echo Step 1: Installing Cloudflare Tunnel...
echo.
curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -o cloudflared.exe
move cloudflared.exe C:\Windows\System32\cloudflared.exe
echo ✅ Cloudflared installed
echo.

echo Step 2: Login to Cloudflare (browser will open)...
cloudflared tunnel login
echo.

echo Step 3: Create tunnel...
echo Enter a name for your tunnel (e.g., strategic-advisor):
set /p TUNNEL_NAME="Tunnel name: "
cloudflared tunnel create %TUNNEL_NAME%
echo.

echo Step 4: Get tunnel ID...
for /f "tokens=*" %%i in ('cloudflared tunnel list ^| findstr /C:"%TUNNEL_NAME%"') do set TUNNEL_LINE=%%i
for /f "tokens=1" %%i in ("%TUNNEL_LINE%") do set TUNNEL_ID=%%i
echo Tunnel ID: %TUNNEL_ID%
echo.

echo Step 5: Creating configuration...
mkdir "%USERPROFILE%\.cloudflared" 2>nul

echo tunnel: %TUNNEL_ID% > "%USERPROFILE%\.cloudflared\config.yml"
echo credentials-file: %USERPROFILE%\.cloudflared\%TUNNEL_ID%.json >> "%USERPROFILE%\.cloudflared\config.yml"
echo. >> "%USERPROFILE%\.cloudflared\config.yml"
echo ingress: >> "%USERPROFILE%\.cloudflared\config.yml"
echo   - service: http://localhost:5173 >> "%USERPROFILE%\.cloudflared\config.yml"

echo ✅ Configuration created
echo.

echo Step 6: Start tunnel (testing)...
start "Cloudflare Tunnel" cloudflared tunnel run %TUNNEL_NAME%
timeout /t 5
echo.

echo Step 7: Getting public URL...
cloudflared tunnel info %TUNNEL_NAME%
echo.

echo ============================================
echo  ✅ TUNNEL READY!
echo ============================================
echo.
echo Your app is now accessible globally at:
echo https://%TUNNEL_ID%.cfargotunnel.com
echo.
echo Next steps:
echo 1. Test the URL in your mobile browser
echo 2. Save this URL for Siri shortcuts
echo 3. Update PWA manifest with this URL
echo.
echo To install as Windows service (auto-start):
echo   cloudflared service install
echo.
pause
