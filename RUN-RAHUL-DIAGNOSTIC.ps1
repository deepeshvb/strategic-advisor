# Run Rahul employee-search diagnostic
# Use after restarting the backend. Run in PowerShell from project root.

Write-Host "`n=== Rahul Employee Search Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# 1. Quick ping
Write-Host "1. Pinging backend..." -ForegroundColor Yellow
try {
    $ping = Invoke-RestMethod -Uri "http://localhost:3000/api/ping" -Method Get -TimeoutSec 5
    Write-Host "   Backend is UP." -ForegroundColor Green
} catch {
    Write-Host "   Backend not reachable. Start it first: node backend\server.js" -ForegroundColor Red
    exit 1
}

# 2. Config-only check
Write-Host "`n2. Config check (no API calls)..." -ForegroundColor Yellow
try {
    $cfg = Invoke-RestMethod -Uri "http://localhost:3000/api/test/employee-search?ping=1" -Method Get -TimeoutSec 15
    Write-Host "   CEO email: $($cfg.ceoEmail)" -ForegroundColor Green
    Write-Host "   Azure creds: $($cfg.hasAzureCreds)" -ForegroundColor Green
} catch {
    Write-Host "   Failed: $_" -ForegroundColor Red
}

# 3. Light employee search (CEO inbox + targeted search)
Write-Host "`n3. Light employee search for 'Rahul' (may take 1-2 min)..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/test/employee-search?name=Rahul&light=1" -Method Get -TimeoutSec 180
    Write-Host ""
    Write-Host "   Results:" -ForegroundColor Green
    Write-Host "   - CEO inbox messages: $($result.ceoInboxMessages)"
    Write-Host "   - Matching in CEO inbox: $($result.matchingInCEOInbox)"
    Write-Host "   - Targeted search mailboxes: $($result.targetedSearchMailboxes)"
    Write-Host "   - Targeted search messages: $($result.targetedSearchMessages)"
    if ($result.targetedSearchError) {
        Write-Host "   - Targeted search error: $($result.targetedSearchError)" -ForegroundColor Red
    }
    if ($result.sampleMatching -and $result.sampleMatching.Count -gt 0) {
        Write-Host "`n   Sample matching emails:" -ForegroundColor Cyan
        $result.sampleMatching | ForEach-Object { Write-Host "     - $($_.fromName) | $($_.subject)" }
    } else {
        Write-Host "`n   No matching emails found." -ForegroundColor Red
    }
    Write-Host ""
} catch {
    Write-Host "   Failed (timeout or error): $_" -ForegroundColor Red
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
Write-Host ""
