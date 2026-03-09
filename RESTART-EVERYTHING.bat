@echo off
echo ============================================
echo  RESTART ALL SERVICES - Clean Start
echo ============================================
echo.

echo Step 1: Stopping all Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul
echo ✅ Stopped

echo.
echo Step 2: Starting Voice API Server (port 3001)...
start "Voice API" cmd /k "cd /d %~dp0 && node voice-server.cjs"
timeout /t 4 /nobreak >nul
echo ✅ Started

echo.
echo Step 3: Starting Dev Server (port 5173)...
start "Dev Server" cmd /k "cd /d %~dp0 && npm run dev"
timeout /t 5 >nul
echo ✅ Started

echo.
echo Step 4: Testing Voice API...
timeout /t 2 /nobreak >nul
curl -s -m 5 http://localhost:3001/api/voice/health
if errorlevel 1 (
  echo.
  echo ⚠ Voice API not responding yet. Check the "Voice API" window for errors.
) else (
  echo.
)

echo.
echo ============================================
echo  ✅ ALL SERVICES RUNNING!
echo ============================================
echo.
echo Services:
echo   Voice API: http://localhost:3001
echo   Dev Server: http://localhost:5173
echo   Proxied API: http://localhost:5173/api/voice/...
echo.
echo Ngrok URL (already running):
echo   https://closefisted-felice-hamamelidaceous.ngrok-free.dev
echo.
echo Test Voice API via Siri URL:
echo   https://closefisted-felice-hamamelidaceous.ngrok-free.dev/api/voice/critical
echo.
pause
