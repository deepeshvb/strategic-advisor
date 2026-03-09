@echo off
title Transcription API connectivity check
cd /d "%~dp0"
echo.
echo 1) Testing from THIS MACHINE to api.openai.com (PowerShell)...
echo.
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'https://api.openai.com' -UseBasicParsing -TimeoutSec 10; Write-Host '   OK - Machine can reach api.openai.com' -ForegroundColor Green } catch { Write-Host '   FAIL -' $_.Exception.Message -ForegroundColor Red }"
echo.
echo 2) Testing from BACKEND (Node) to api.openai.com...
echo    (Backend must be running - START-BACKEND.bat window open)
echo.
powershell -NoProfile -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:3000/api/test/openai-reach' -TimeoutSec 15; if ($r.reachable) { Write-Host '   OK - Backend can reach OpenAI' -ForegroundColor Green } else { Write-Host '   FAIL -' $r.error -ForegroundColor Red } } catch { Write-Host '   FAIL - Backend not running or' $_.Exception.Message -ForegroundColor Red }"
echo.
echo 3) Testing from THIS MACHINE to api.groq.com...
echo.
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'https://api.groq.com' -UseBasicParsing -TimeoutSec 10; Write-Host '   OK - Machine can reach api.groq.com' -ForegroundColor Green } catch { Write-Host '   FAIL -' $_.Exception.Message -ForegroundColor Red }"
echo.
echo If (1) or (3) FAIL: firewall/proxy/network is blocking this PC.
echo If (1)/(3) OK but (2) FAIL: Node might need proxy (set HTTPS_PROXY in .env.backend).
echo.
pause
