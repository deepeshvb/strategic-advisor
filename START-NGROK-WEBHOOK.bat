@echo off
echo ============================================
echo  Ngrok - Webhook + UI (single tunnel)
echo ============================================
echo.
echo This tunnel will serve BOTH:
echo   - Config UI (mobile): https://YOUR-URL
echo   - Twilio webhooks:     https://YOUR-URL/webhook/whatsapp
echo.
echo IMPORTANT: Start these first:
echo   1. Backend:  START-BACKEND.bat
echo   2. Frontend: START-CONFIG-UI.bat
echo.
echo Port 5173 = Frontend (proxies webhooks to backend)
echo.
pause

cd /d "%~dp0"
start "Ngrok" ngrok http 5173

echo.
echo Check the Ngrok window for your HTTPS URL.
echo Update Twilio webhook: https://YOUR-URL/webhook/whatsapp
echo.
pause
