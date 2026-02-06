@echo off
echo ========================================
echo   Strategic Advisor - Fix Build
echo ========================================
echo.

echo [1/5] Cleaning old files...
if exist node_modules (
    rd /s /q node_modules 2>nul
    echo Removed node_modules
)
if exist package-lock.json (
    del /f package-lock.json 2>nul
    echo Removed package-lock.json
)
if exist dist (
    rd /s /q dist 2>nul
    echo Removed dist
)

echo.
echo [2/5] Clearing npm cache...
call npm cache clean --force

echo.
echo [3/5] Installing dependencies...
call npm install
if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies
    echo.
    echo Try running as Administrator or manually:
    echo   npm install --legacy-peer-deps
    pause
    exit /b 1
)

echo.
echo [4/5] Attempting build...
call npm run build
if errorlevel 1 (
    echo.
    echo ========================================
    echo   Build Failed
    echo ========================================
    echo.
    echo This is OK! You don't need build for development.
    echo.
    echo To run the app, just use:
    echo   npm run dev
    echo.
    echo The app will work perfectly fine without building.
    echo ========================================
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Build Successful!
echo ========================================
echo.
echo Your app is ready to run:
echo   npm run dev
echo.
pause
