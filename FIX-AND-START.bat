@echo off
echo ========================================
echo   FIX BUILD ISSUES AND START SERVER
echo ========================================
echo.

REM Kill any existing node processes
taskkill /F /IM node.exe >nul 2>&1

REM Remove problematic folders
echo Cleaning up...
if exist node_modules\.vite rd /s /q node_modules\.vite
if exist node_modules\.cache rd /s /q node_modules\.cache
if exist node_modules\esbuild rd /s /q node_modules\esbuild
if exist node_modules\@esbuild rd /s /q node_modules\@esbuild

echo Reinstalling esbuild...
call npm install esbuild --force

echo.
echo Starting server...
echo.
echo Access from:
echo   Computer: http://localhost:5173
echo   Mobile: http://10.1.10.93:5173
echo.

call npm run dev

pause
