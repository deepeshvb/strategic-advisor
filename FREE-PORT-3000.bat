@echo off
title Free ports 3000-3002
echo Freeing ports 3000-3005 (backend and all fallbacks)...
powershell -NoProfile -Command "3000..3005 | ForEach-Object { $port = $_; Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object { $p = $_.OwningProcess; if ($p) { Write-Host \"Killing process $p on port $port...\"; Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } } }"
echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul
echo Done. You can start the backend now.
pause
