@echo off
echo ========================================
echo Strategic Coworker - Installation Script
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js first:
    echo 1. Visit https://nodejs.org/
    echo 2. Download and install the LTS version
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js is installed
node --version
echo.

REM Check if npm is available
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not available!
    echo Please reinstall Node.js
    pause
    exit /b 1
)

echo [OK] npm is available
npm --version
echo.

echo Installing dependencies...
echo This may take a few minutes...
echo.

call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to install dependencies
    echo Please check your internet connection and try again
    pause
    exit /b 1
)

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Starting development server...
echo.
echo The app will open at: http://localhost:5173
echo Press Ctrl+C to stop the server
echo.

call npm run dev

pause
