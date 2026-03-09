# Run as Administrator - Right-click > Run with PowerShell (as Admin)
# Or: Start-Process powershell -Verb RunAs -ArgumentList "-File $PSCommandPath"

$projectRoot = $PSScriptRoot
$svcDir = "C:\Windows\System32\config\systemprofile\.cloudflared"
$tunnelId = "395a6aaf-e6e5-45b0-bec0-665f54be5291"
$cloudflaredPath = Join-Path $projectRoot "cloudflared.exe"
$userConfig = "$env:USERPROFILE\.cloudflared"

# Use user folder - SYSTEM can read it
$configPath = "$userConfig\config.yml"

Write-Host "Installing Cloudflare Tunnel as Windows Service..." -ForegroundColor Cyan

# Stop existing process
Stop-Process -Name "cloudflared" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Create systemprofile dir and copy files (requires admin)
New-Item -ItemType Directory -Path $svcDir -Force | Out-Null
Copy-Item "$userConfig\cert.pem" "$svcDir\cert.pem" -Force
Copy-Item "$userConfig\$tunnelId.json" "$svcDir\$tunnelId.json" -Force

# Create config with ingress for hostname routing
$configContent = @"
tunnel: $tunnelId
credentials-file: $svcDir\$tunnelId.json

ingress:
  - hostname: webhook.lobstermoltys.com
    service: http://localhost:3000
  - service: http_status:404
"@
Set-Content "$svcDir\config.yml" $configContent -Encoding UTF8

# Install service
& $cloudflaredPath service install
if ($LASTEXITCODE -ne 0) { exit 1 }

# Configure to use our config
$binPath = "`"$cloudflaredPath`" tunnel --config `"$svcDir\config.yml`" run strategic-advisor"
sc.exe config cloudflared binPath= $binPath

# Start service
Start-Service cloudflared

Write-Host "`nSUCCESS! Tunnel installed as Windows service." -ForegroundColor Green
Write-Host "It will auto-start when Windows boots."
Write-Host "`nCommands: net start cloudflared | net stop cloudflared | sc query cloudflared"
