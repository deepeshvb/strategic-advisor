@echo off
echo ========================================
echo   Strategic Advisor - Quick Start
echo   (Skipping build - not needed!)
echo ========================================
echo.

echo [1/2] Installing dependencies...
if not exist "node_modules" (
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed
)

echo.
echo [2/2] Starting app...
echo.
echo ========================================
echo   Build is NOT required for development!
echo   npm run dev works without building.
echo ========================================
echo.
echo App will launch at: http://localhost:5173
echo.

start http://localhost:5173
call npm run dev
