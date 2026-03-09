# Kill all processes listening on ports 3000-3005 (Strategic Advisor backend)
# Step 1: kill by port (any state - Listen, Established, etc.). Step 2: kill ALL node.exe (nuclear).
$ErrorActionPreference = "SilentlyContinue"
$ports = 3000..3005
$pidsToKill = [System.Collections.Generic.HashSet[int]]::new()

foreach ($port in $ports) {
    # Get all connections on this port (Listen and other states - some Windows builds report differently)
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        if ($c.OwningProcess -gt 0) { [void]$pidsToKill.Add($c.OwningProcess) }
    }
}

if ($pidsToKill.Count -gt 0) {
    Write-Host "Killing $($pidsToKill.Count) process(es) on ports 3000-3005: $($pidsToKill -join ', ')"
    foreach ($pid in $pidsToKill) {
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        $name = if ($proc) { $proc.ProcessName } else { "?" }
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        $result = & cmd /c "taskkill /PID $pid /F 2>&1"
        if (Get-Process -Id $pid -ErrorAction SilentlyContinue) {
            Start-Sleep -Milliseconds 500
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            & cmd /c "taskkill /PID $pid /F 2>&1"
        }
        Write-Host "  PID $pid ($name)"
    }
}

# Nuclear: kill ALL node.exe so no backend can still be holding ports (e.g. if taskkill didn't work)
$nodeProcs = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcs) {
    Write-Host "Stopping all node.exe processes ($($nodeProcs.Count))..."
    $nodeProcs | Stop-Process -Force -ErrorAction SilentlyContinue
    & cmd /c "taskkill /IM node.exe /F 2>nul"
}

Start-Sleep -Seconds 4
# Verify and show who is still on the port
function Test-PortsAndReport {
    $bad = @()
    foreach ($port in $ports) {
        $c = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($c) {
            $p = $c.OwningProcess
            $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
            $name = if ($proc) { $proc.ProcessName } else { "?" }
            $bad += [pscustomobject]@{ Port = $port; PID = $p; Name = $name }
        }
    }
    $bad
}

$stillInUse = Test-PortsAndReport
if ($stillInUse.Count -gt 0) {
    # One more try: kill by PID then kill all node again
    Write-Host "Port(s) still in use. Killing those PIDs and all node.exe again, waiting 5 sec..."
    $stillInUse | ForEach-Object { Stop-Process -Id $_.PID -Force -ErrorAction SilentlyContinue; & cmd /c "taskkill /PID $($_.PID) /F 2>nul" }
    & cmd /c "taskkill /IM node.exe /F 2>nul"
    Start-Sleep -Seconds 5
    $stillInUse = Test-PortsAndReport
}

if ($stillInUse.Count -gt 0) {
    Write-Host ""
    Write-Host "Port(s) still in use:" -ForegroundColor Red
    $stillInUse | ForEach-Object { Write-Host "  Port $($_.Port): PID $($_.PID) ($($_.Name))" -ForegroundColor Red }
    Write-Host "Disable Startup/Watchdog that may be restarting the backend, or close the app using port 3000."
    exit 1
}
Write-Host "Done. Ports 3000-3005 are free."
exit 0
