# Restart backend to pick up voice note changes (OPENAI_API_KEY, ffmpeg)
# Run in PowerShell (as Admin if using scheduled task)

Write-Host "Restarting Strategic Advisor Backend..." -ForegroundColor Cyan

# Refresh PATH so ffmpeg is found (if installed via winget)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Stop the scheduled task (stops the daemon)
Stop-ScheduledTask -TaskName "StrategicAdvisorBackend" -ErrorAction SilentlyContinue
Write-Host "Stopped StrategicAdvisorBackend task"
Start-Sleep -Seconds 5

# Kill any process still on port 3000
$conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    $procId = $conn.OwningProcess | Select-Object -First 1
    taskkill /F /PID $procId 2>$null
    Write-Host "Killed process on port 3000"
    Start-Sleep -Seconds 3
}

# Start the task again
Start-ScheduledTask -TaskName "StrategicAdvisorBackend" -ErrorAction SilentlyContinue
Write-Host "Started StrategicAdvisorBackend task"
Start-Sleep -Seconds 5

# Verify
try {
    $r = Invoke-WebRequest -Uri "http://localhost:3000/api/voice-notes/check" -UseBasicParsing -TimeoutSec 5
    $j = $r.Content | ConvertFrom-Json
    Write-Host "`nVoice notes check:" -ForegroundColor Green
    Write-Host "  OpenAI key set: $($j.openaiKeySet)"
    Write-Host "  ffmpeg works: $($j.ffmpegWorks)"
    Write-Host "  $($j.hint)"
} catch {
    Write-Host "`nBackend may still be starting. Try: http://localhost:3000/api/voice-notes/check" -ForegroundColor Yellow
}
