@echo off
echo ========================================
echo Strategic Advisor - Network Launch
echo ========================================
echo.
echo This will make the app accessible from your phone!
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install from: https://nodejs.org
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo 📱 MOBILE ACCESS INSTRUCTIONS
echo ========================================
echo.
echo 1. Make sure your phone and computer are on the SAME WiFi network
echo.
echo 2. On your phone, open your browser and go to:
echo.
echo    http://10.1.10.93:5173
echo.
echo    OR scan this QR code (if you have a QR generator):
echo    Generate QR for: http://10.1.10.93:5173
echo.
echo 3. To install as app on your phone:
echo    - Android: Menu ⋮ → "Install app" or "Add to Home Screen"
echo    - iOS: Share button □↑ → "Add to Home Screen"
echo.
echo 4. Grant notification permission when prompted for alerts
echo.
echo ========================================
echo Starting server...
echo ========================================
echo.

:: Start the dev server
call npm run dev

pause
