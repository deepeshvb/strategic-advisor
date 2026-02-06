@echo off
echo ========================================
echo   Strategic Advisor - Launch Script
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [1/3] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install dependencies
        echo Please ensure Node.js and npm are installed
        pause
        exit /b 1
    )
) else (
    echo [1/3] Dependencies already installed
)

echo.
echo [2/3] Checking Ollama status...
curl -s http://localhost:11434 > nul 2>&1
if errorlevel 1 (
    echo.
    echo WARNING: Ollama is not running
    echo.
    echo For PRIVACY MODE, please:
    echo 1. Install Ollama from: https://ollama.com/download
    echo 2. Download a model: ollama pull llama3.1:8b
    echo 3. Restart this script
    echo.
    echo Press any key to continue anyway ^(will use cloud API if configured^)...
    pause > nul
) else (
    echo Ollama is running! Privacy mode available.
)

echo.
echo [3/3] Starting Strategic Advisor...
echo.
echo App will launch at: http://localhost:5173
echo.
echo ===========================================
echo   FIRST-TIME SETUP:
echo ===========================================
echo 1. Go to Settings ^> Local LLM
echo 2. Check Ollama status
echo 3. Select your model
echo 4. Enable Local LLM
echo 5. Verify Companies tab shows your 3 companies
echo ===========================================
echo.

start http://localhost:5173
npm run dev
