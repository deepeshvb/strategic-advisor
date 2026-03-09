# Run deployment - use current user to avoid UAC for task creation
$projectRoot = "c:\Users\deepe\strategic-coworker-app"
$ErrorActionPreference = "Stop"

# 1. Backend task
$taskName = "StrategicAdvisorBackend"
$daemonVbs = "$projectRoot\backend\run-backend-hidden.vbs"
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$daemonVbs`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal
Start-ScheduledTask -TaskName $taskName
Write-Host "Backend task: $taskName - STARTED" -ForegroundColor Green

# 2. Watchdog task
$watchName = "StrategicAdvisorWatchdog"
$watchScript = "$projectRoot\Watchdog.ps1"
Unregister-ScheduledTask -TaskName $watchName -Confirm:$false -ErrorAction SilentlyContinue
$action2 = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$watchScript`""
$trigger1 = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings2 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName $watchName -Action $action2 -Trigger $trigger1,$trigger2 -Settings $settings2 -Principal $principal
Write-Host "Watchdog task: $watchName - INSTALLED" -ForegroundColor Green

# 3. Start tunnel (needs admin - try anyway)
Start-Service -Name "cloudflared" -ErrorAction SilentlyContinue
if ((Get-Service -Name "cloudflared" -ErrorAction SilentlyContinue).Status -eq "Running") {
    Write-Host "Tunnel: cloudflared - STARTED" -ForegroundColor Green
} else {
    Write-Host "Tunnel: Run 'net start cloudflared' as Admin" -ForegroundColor Yellow
}

Write-Host "`nDeployment complete." -ForegroundColor Cyan
