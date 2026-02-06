@echo off
cls
echo.
echo ========================================
echo   STRATEGIC ADVISOR - LAUNCH
echo ========================================
echo.
echo   Your AI-powered executive intelligence
echo   platform is starting...
echo.
echo ========================================
echo.

REM Check if already running
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [!] Node.js is already running
    echo     This might be your app already running.
    echo.
    echo     If app is NOT open, press Ctrl+C now,
    echo     then run: taskkill /F /IM node.exe
    echo.
    pause
)

echo [Step 1/3] Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install dependencies
        echo Please ensure Node.js and npm are installed.
        echo Download from: https://nodejs.org/
        pause
        exit /b 1
    )
) else (
    echo Dependencies OK
)

echo.
echo [Step 2/3] Checking Local LLM (Ollama)...
curl -s http://localhost:11434 >nul 2>&1
if errorlevel 1 (
    echo.
    echo ┌─────────────────────────────────────────┐
    echo │ ⚠️  Ollama Not Detected                 │
    echo └─────────────────────────────────────────┘
    echo.
    echo For PRIVACY MODE (recommended):
    echo   1. Install: https://ollama.com/download
    echo   2. Run: ollama pull llama3.1:8b
    echo   3. Restart this script
    echo.
    echo Continuing with cloud API fallback...
    echo (Requires API key in .env file)
    echo.
    timeout /t 3 >nul
) else (
    echo ✓ Ollama is running - Privacy mode available!
)

echo.
echo [Step 3/3] Launching Strategic Advisor...
echo.
echo ┌─────────────────────────────────────────┐
echo │  App will open at:                      │
echo │  http://localhost:5173                  │
echo │                                          │
echo │  First-time setup:                      │
echo │  1. Go to Settings → Local LLM          │
echo │  2. Enable Local LLM                    │
echo │  3. Verify companies are loaded         │
echo └─────────────────────────────────────────┘
echo.

REM Wait a moment then open browser
start /B cmd /c "timeout /t 2 >nul && start http://localhost:5173" >nul 2>&1

echo Starting development server...
echo.
echo ┌─────────────────────────────────────────┐
echo │  Press Ctrl+C to stop the server        │
echo └─────────────────────────────────────────┘
echo.

call npm run dev
