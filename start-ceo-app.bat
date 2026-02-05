@echo off
echo ========================================
echo Strategic Coworker - CEO Edition
echo Powered by Claude 3.5 Sonnet
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Installing dependencies...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies!
        echo Make sure Node.js and npm are installed.
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] Dependencies installed!
    echo.
)

REM Check if .env exists
if not exist ".env" (
    echo [WARNING] .env file not found!
    echo Creating .env template...
    echo VITE_ANTHROPIC_API_KEY=your-api-key-here > .env
    echo.
    echo [ACTION REQUIRED] Please add your Anthropic API key to the .env file
    echo Then run this script again.
    pause
    exit /b 1
)

echo [INFO] Starting development server...
echo.
echo Once the server starts:
echo 1. Your browser will open automatically
echo 2. Try clicking "Load Daily Briefing"
echo 3. Or ask: "What are my top priorities?"
echo.
echo The AI will analyze your synthetic data and provide
echo CEO-level strategic insights and clarification strategies.
echo.
echo Press Ctrl+C to stop the server when done.
echo.
echo ========================================
echo.

call npm run dev
