@echo off
REM Backend daemon - restarts node if it crashes
cd /d "%~dp0.."
REM Add ffmpeg to PATH for voice note transcription (ffmpeg-static in node_modules)
set "PROJECT=%cd%"
set "PATH=%PROJECT%\node_modules\ffmpeg-static;%PATH%"
:loop
node backend\server.js
timeout /t 5 /nobreak >nul
goto loop
