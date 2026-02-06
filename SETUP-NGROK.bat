@echo off
echo ============================================
echo  Ngrok Setup - Instant Remote Access
echo ============================================
echo.
echo Ngrok is simpler than Cloudflare Tunnel
echo Get remote access in 2 minutes!
echo.
pause

echo Step 1: Download Ngrok...
echo.
echo Opening Ngrok download page...
start https://ngrok.com/download
echo.
echo INSTRUCTIONS:
echo 1. Download ngrok for Windows (ZIP file)
echo 2. Extract ngrok.exe to this folder
echo 3. Sign up for FREE account at ngrok.com/signup
echo 4. Copy your authtoken from dashboard
echo.
pause

echo.
echo Step 2: Authenticate Ngrok
echo.
echo Please enter your Ngrok authtoken:
echo (From: https://dashboard.ngrok.com/get-started/your-authtoken)
echo.
set /p NGROK_TOKEN="Authtoken: "

if exist ngrok.exe (
    ngrok config add-authtoken %NGROK_TOKEN%
    echo ✅ Authenticated!
) else (
    echo ERROR: ngrok.exe not found in current folder
    echo Please download and extract ngrok.exe here first
    pause
    exit /b 1
)

echo.
echo Step 3: Starting tunnel to localhost:5173...
echo.
echo ⚠️ IMPORTANT: Leave this window open!
echo Your public URL will appear below.
echo.
pause

start "Ngrok Tunnel" ngrok http 5173

echo.
echo ============================================
echo  ✅ TUNNEL RUNNING!
echo ============================================
echo.
echo Check the Ngrok window for your URL:
echo It will look like: https://abc123.ngrok.io
echo.
echo SAVE THAT URL - use it on your mobile!
echo.
echo To make permanent (paid plan $8/mo):
echo   - Upgrade to Ngrok paid plan
echo   - Get fixed domain (doesn't change)
echo.
pause
