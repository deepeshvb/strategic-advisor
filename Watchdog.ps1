# Strategic Advisor - Network & Service Watchdog
# Runs every 5 minutes via Task Scheduler
# Restarts backend and tunnel when internet is restored after disconnect

$ErrorActionPreference = "SilentlyContinue"
$projectRoot = $PSScriptRoot
$stateFile = "$projectRoot\.watchdog-state"
$backendTask = "StrategicAdvisorBackend"
$tunnelService = "cloudflared"
$backendPorts = 3000..3005
$logFile = "$projectRoot\logs\watchdog.log"

# Ensure logs dir exists
New-Item -ItemType Directory -Path "$projectRoot\logs" -Force | Out-Null

function Log {
    param([string]$msg)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $msg"
    Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue
}

function Test-Internet {
    # Use a silent HTTP check instead of Test-NetConnection (which can pop up "Attempting TCP connect" window)
    try {
        $r = Invoke-WebRequest -Uri "https://www.google.com/generate_204" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        return $r.StatusCode -eq 204
    } catch {
        try {
            $r = Invoke-WebRequest -Uri "https://1.1.1.1" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
            return $true
        } catch {
            return $false
        }
    }
}

function Test-Backend {
    foreach ($port in $backendPorts) {
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:$port/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
            if ($r.StatusCode -eq 200) { return $true }
        } catch { }
    }
    return $false
}

function Restart-Services {
    Log "Restarting services (network restored or service down)..."
    
    # Stop
    Stop-ScheduledTask -TaskName $backendTask -ErrorAction SilentlyContinue
    Stop-Service -Name $tunnelService -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    
    # Start
    Start-Service -Name $tunnelService -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Start-ScheduledTask -TaskName $backendTask -ErrorAction SilentlyContinue
    
    Log "Services restarted."
}

# Read previous state
$wasOnline = $true
if (Test-Path $stateFile) {
    $content = Get-Content $stateFile -Raw
    $wasOnline = [bool][int]$content
}

# Check current state
$isOnline = Test-Internet

# Persist state
[int]$isOnline | Set-Content $stateFile -Force

# If we were offline and now online -> restart everything
if (-not $wasOnline -and $isOnline) {
    Log "Network restored after disconnect. Restarting all services."
    Restart-Services
    exit 0
}

# If offline, just log and exit (will restart when back online)
if (-not $isOnline) {
    Log "Network offline. Will restart when connectivity restored."
    exit 0
}

# Online: verify backend and tunnel are running
$backendOk = Test-Backend
$tunnelRunning = (Get-Service -Name $tunnelService -ErrorAction SilentlyContinue).Status -eq "Running"
$backendTaskState = (Get-ScheduledTask -TaskName $backendTask -ErrorAction SilentlyContinue).State
$backendRunning = $backendTaskState -eq "Running"

if (-not $backendOk -or -not $tunnelRunning -or -not $backendRunning) {
    Log "Service check failed. Backend OK=$backendOk Tunnel=$tunnelRunning BackendTask=$backendRunning"
    Restart-Services
}
