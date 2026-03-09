# Run as Administrator - fixes tunnel config for hostname routing
$svcDir = "C:\Windows\System32\config\systemprofile\.cloudflared"
$tunnelId = "395a6aaf-e6e5-45b0-bec0-665f54be5291"

$config = @"
tunnel: $tunnelId
credentials-file: $svcDir\$tunnelId.json

ingress:
  - hostname: webhook.lobstermoltys.com
    service: http://localhost:3000
  - service: http_status:404
"@

Set-Content "$svcDir\config.yml" $config -Encoding UTF8
Restart-Service Cloudflared
Write-Host "Config updated. Service restarted." -ForegroundColor Green
