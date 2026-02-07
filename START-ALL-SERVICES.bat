@echo off
echo ============================================
echo  FULL SYSTEM STARTUP - All Services
echo ============================================
echo.
echo Starting:
echo 1. Voice API Server (port 3001)
echo 2. Dev Server (port 5173)
echo 3. Ngrok Tunnel (global access)
echo.
pause

echo.
echo [1/3] Starting Voice API Server...
start "Voice API" cmd /k "npm run api"
timeout /t 3 >nul

echo [2/3] Starting Dev Server...
start "Dev Server" cmd /k "npm run dev"
timeout /t 5 >nul

echo [3/3] Starting Ngrok Tunnel...
start "Ngrok Tunnel" cmd /k "ngrok http 5173"
timeout /t 5 >nul

echo.
echo ============================================
echo  ✅ ALL SERVICES STARTED!
echo ============================================
echo.
echo Three windows opened:
echo   1. Voice API - http://localhost:3001
echo   2. Dev Server - http://localhost:5173
echo   3. Ngrok Tunnel - https://your-id.ngrok-free.dev
echo.
echo Check the Ngrok window for your public URL!
echo.
echo Keep all three windows open for 24/7 operation.
echo.
pause
