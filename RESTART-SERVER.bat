@echo off
echo ============================================
echo  Restarting Dev Server (Apply Config Changes)
echo ============================================
echo.

echo Stopping any running dev servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo.
echo Starting dev server with new configuration...
echo.
npm run dev

pause
