# Voice Note Diagnostic - Run when voice notes get no response
# Run in PowerShell from project root

Write-Host "`n=== Voice Note Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check webhook log
Write-Host "1. Recent webhook requests (last 5):" -ForegroundColor Yellow
$logPath = "webhook-requests.log"
if (Test-Path $logPath) {
    Get-Content $logPath -Tail 5 | ForEach-Object { Write-Host "   $_" }
} else {
    Write-Host "   webhook-requests.log not found" -ForegroundColor Red
}

# 2. Check for voice note entries (empty BODY, NumMedia)
Write-Host "`n2. Voice note entries (NumMedia > 0):" -ForegroundColor Yellow
if (Test-Path $logPath) {
    $voice = Get-Content $logPath | Select-String "NumMedia: [1-9]"
    if ($voice) { $voice | Select-Object -Last 3 | ForEach-Object { Write-Host "   $_" } }
    else { Write-Host "   None found (log may use old format)" -ForegroundColor Gray }
}

# 3. Check webhook errors
Write-Host "`n3. Recent webhook errors:" -ForegroundColor Yellow
$errPath = "backend\webhook-errors.log"
if (Test-Path $errPath) {
    Get-Content $errPath -Tail 5 | ForEach-Object { Write-Host "   $_" }
} else {
    Write-Host "   No webhook-errors.log" -ForegroundColor Gray
}

# 4. Backend reachable
Write-Host "`n4. Backend health:" -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod -Uri "http://localhost:3000/api/ping" -TimeoutSec 3
    Write-Host "   Backend UP" -ForegroundColor Green
} catch {
    Write-Host "   Backend not reachable on localhost:3000" -ForegroundColor Red
}

# 5. Voice notes check
Write-Host "`n5. Voice notes config:" -ForegroundColor Yellow
try {
    $v = Invoke-RestMethod -Uri "http://localhost:3000/api/voice-notes/check" -TimeoutSec 5
    Write-Host "   OpenAI key: $($v.openaiKeySet)" -ForegroundColor $(if ($v.openaiKeySet) { "Green" } else { "Red" })
    Write-Host "   ffmpeg: $($v.ffmpegWorks)" -ForegroundColor $(if ($v.ffmpegWorks) { "Green" } else { "Red" })
} catch {
    Write-Host "   Could not check" -ForegroundColor Red
}

# 6. Tunnel check
Write-Host "`n6. Cloudflare tunnel:" -ForegroundColor Yellow
$svc = Get-Service -Name "cloudflared" -ErrorAction SilentlyContinue
if ($svc) {
    Write-Host "   Status: $($svc.Status)" -ForegroundColor $(if ($svc.Status -eq "Running") { "Green" } else { "Red" })
} else {
    Write-Host "   cloudflared service not installed" -ForegroundColor Gray
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
Write-Host ""
