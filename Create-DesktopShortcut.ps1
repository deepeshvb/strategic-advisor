# Creates a desktop shortcut to open the Strategic Advisor Config Dashboard.
# Run from the project folder: powershell -ExecutionPolicy Bypass -File Create-DesktopShortcut.ps1

$projectDir = $PSScriptRoot
if (-not $projectDir) { $projectDir = Get-Location | Select-Object -ExpandProperty Path }

$batPath = Join-Path $projectDir "OPEN-CONFIG-DASHBOARD.bat"
$desktop  = [Environment]::GetFolderPath("Desktop")
$lnkPath  = Join-Path $desktop "Strategic Advisor Config.lnk"

if (-not (Test-Path $batPath)) {
    Write-Host "ERROR: OPEN-CONFIG-DASHBOARD.bat not found at: $batPath" -ForegroundColor Red
    exit 1
}

$WshShell = New-Object -ComObject WScript.Shell
$shortcut = $WshShell.CreateShortcut($lnkPath)
$shortcut.TargetPath   = $batPath
$shortcut.WorkingDirectory = $projectDir
$shortcut.Description  = "Open Strategic Advisor Configuration Dashboard"
$shortcut.Save()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($WshShell) | Out-Null

Write-Host "Shortcut created: $lnkPath" -ForegroundColor Green
Write-Host "Double-click 'Strategic Advisor Config' on your desktop to start the app and open the dashboard." -ForegroundColor Cyan
