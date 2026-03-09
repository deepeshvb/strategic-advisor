# Run as Administrator - Installs watchdog as scheduled task
# Runs every 5 minutes to monitor network and restart services on disconnect/reconnect

$projectRoot = $PSScriptRoot
$watchdogScript = "$projectRoot\Watchdog.ps1"
$taskName = "StrategicAdvisorWatchdog"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  STRATEGIC ADVISOR - WATCHDOG SETUP    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
  # Remove existing task
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Removed old task (if any)." -ForegroundColor Gray

  # Create task - at startup + every 5 minutes (use VBS launcher so no blank console window flashes)
  $vbsLauncher = "$projectRoot\run-watchdog-hidden.vbs"
  if (-not (Test-Path $vbsLauncher)) {
    throw "Missing file: run-watchdog-hidden.vbs (should be in $projectRoot)"
  }
  $action = New-ScheduledTaskAction -Execute "wscript.exe" `
    -Argument "`"$vbsLauncher`""
  $trigger1 = New-ScheduledTaskTrigger -AtStartup
  $trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
  $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

  $ErrorActionPreference = "Stop"
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger1,$trigger2 -Settings $settings -Principal $principal | Out-Null

  Write-Host ""
  Write-Host "Watchdog installed. Runs every 5 minutes (no window flash)." -ForegroundColor Green
  Write-Host "  Log: $projectRoot\logs\watchdog.log"
  Write-Host ""
  Write-Host "To run manually: powershell -File `"$watchdogScript`""
} catch {
  Write-Host ""
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Run RUN-INSTALL-WATCHDOG.bat as Administrator (right-click -> Run as administrator)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press Enter to close this window..." -ForegroundColor Gray
Read-Host
