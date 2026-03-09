# Run as Administrator - Right-click > Run with PowerShell (as Admin)
# Installs Strategic Advisor backend via Task Scheduler (no NSSM download required)

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
$taskName = "StrategicAdvisorBackend"
$daemonVbs = "$projectRoot\backend\run-backend-hidden.vbs"

if (-not $nodeExe) {
    Write-Host "ERROR: Node.js not found on PATH. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  STRATEGIC ADVISOR - BACKEND SERVICE   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create logs directory
New-Item -ItemType Directory -Path "$projectRoot\logs" -Force | Out-Null

# Remove existing task
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# Create task - run at startup (daemon batch restarts node if it crashes)
$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$daemonVbs`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal | Out-Null

# Run now
Start-ScheduledTask -TaskName $taskName

Write-Host "SUCCESS! Backend installed via Task Scheduler." -ForegroundColor Green
Write-Host "  Task: $taskName (runs at startup, auto-restarts on crash)"
Write-Host ""
Write-Host "Commands:"
Write-Host "  Start:  Start-ScheduledTask -TaskName $taskName"
Write-Host "  Stop:   Stop-ScheduledTask -TaskName $taskName"
Write-Host ""
