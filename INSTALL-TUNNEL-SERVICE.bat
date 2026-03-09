@echo off
echo ============================================
echo  Install Cloudflare Tunnel as Windows Service
echo ============================================
echo.
echo This script requires ADMINISTRATOR privileges.
echo Right-click and select "Run as administrator"
echo.
pause

:: Check for admin
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Please run this script as Administrator.
    echo Right-click INSTALL-TUNNEL-SERVICE.bat ^> Run as administrator
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"

set SVC_DIR=C:\Windows\System32\config\systemprofile\.cloudflared
set TUNNEL_ID=395a6aaf-e6e5-45b0-bec0-665f54be5291
set CLOUDFLARED_PATH=%~dp0cloudflared.exe

echo Stopping tunnel if running...
taskkill /f /im cloudflared.exe 2>nul

echo.
echo Step 1: Creating service config directory...
mkdir "%SVC_DIR%" 2>nul

echo Step 2: Copying cert and credentials...
copy "%USERPROFILE%\.cloudflared\cert.pem" "%SVC_DIR%\cert.pem" /Y
copy "%USERPROFILE%\.cloudflared\%TUNNEL_ID%.json" "%SVC_DIR%\%TUNNEL_ID%.json" /Y

echo Step 3: Creating config for service...
(
echo url: http://localhost:3000
echo tunnel: %TUNNEL_ID%
echo credentials-file: %SVC_DIR%\%TUNNEL_ID%.json
) > "%SVC_DIR%\config.yml"

echo Step 4: Installing cloudflared as Windows service...
"%CLOUDFLARED_PATH%" service install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Installation failed.
    pause
    exit /b 1
)

echo Step 5: Configuring service to use our config...
sc config cloudflared binPath= "\"%CLOUDFLARED_PATH%\" tunnel --config \"%SVC_DIR%\config.yml\" run strategic-advisor"

echo.
echo Step 6: Starting the service...
net start cloudflared

echo.
echo ============================================
echo  SUCCESS!
echo ============================================
echo.
echo The tunnel will now start automatically when Windows boots.
echo.
echo Service commands:
echo   net start cloudflared   - Start service
echo   net stop cloudflared    - Stop service
echo   sc query cloudflared    - Check status
echo.
pause
