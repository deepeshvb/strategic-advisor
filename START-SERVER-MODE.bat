@echo off
cls
echo.
echo ========================================
echo   STRATEGIC ADVISOR - SERVER MODE
echo ========================================
echo.
echo   24/7 Monitoring Server
echo   Home Network Deployment
echo.
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install from: https://nodejs.org
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
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
echo   SERVER MODE CONFIGURATION
echo ========================================
echo.

REM Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do set IP=%%a
set IP=%IP: =%

echo Local Network Access:
echo   http://%IP%:5173
echo   http://localhost:5173
echo.
echo This server will:
echo   ✓ Monitor all configured channels 24/7
echo   ✓ Send alerts when critical items detected
echo   ✓ Be accessible from any device on your network
echo   ✓ Continue monitoring even when browser is closed
echo.
echo ========================================
echo.

REM Check if Ollama is running
curl -s http://localhost:11434 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ Ollama detected - Local LLM available
) else (
    echo ⚠ Ollama not running - Using cloud API
    echo   Install: https://ollama.com/download
)

echo.
echo ========================================
echo   STARTING SERVER...
echo ========================================
echo.
echo Server will run continuously.
echo Press Ctrl+C to stop.
echo.
echo Browser will open automatically...
echo.

REM Open browser after 2 seconds
start /B cmd /c "timeout /t 2 >nul && start http://localhost:5173" >nul 2>&1

REM Start the server
call npm run dev -- --host 0.0.0.0

pause
