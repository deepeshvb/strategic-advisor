# Strategic Advisor – 24/7 Deployment Guide

Your app is ready for full production use. Once deployed, it runs continuously on your laptop, even when the lid is closed or the screen is off.

## Quick Deploy

1. **Right‑click `DEPLOY-24-7.bat`** → **Run as administrator**
2. Ensure `.env.backend` is configured (Twilio, etc.)
3. Finish the script; the app will start automatically

## What Runs 24/7

| Component | Role |
|-----------|------|
| **StrategicAdvisorBackend** (Scheduled task) | Backend API, WhatsApp webhook, monitoring logic |
| **cloudflared** (Windows service) | Tunnel to `https://webhook.lobstermoltys.com` |
| **StrategicAdvisorWatchdog** (Scheduled task) | Checks every 5 minutes; restarts services after network disconnect/reconnect |

## Network Disconnect / Reconnect

- If the laptop loses internet, the watchdog records that it is offline.
- When connectivity returns, it restarts both the backend and tunnel.
- No manual restart is needed after Wi‑Fi or network changes.

## Files Created

- `logs/backend.log` – Backend service log
- `logs/backend-error.log` – Backend errors
- `logs/watchdog.log` – Watchdog activity (including restarts)

## Twilio Webhook URL

Use this URL in your Twilio WhatsApp sandbox:

```
https://webhook.lobstermoltys.com/webhook/whatsapp
```

1. Go to [Twilio WhatsApp Sandbox](https://www.twilio.com/console/sms/whatsapp/sandbox)
2. Set **When a message comes in** to the URL above
3. Save

## Manual Commands

```bat
REM Start/stop backend
Start-ScheduledTask -TaskName StrategicAdvisorBackend
Stop-ScheduledTask -TaskName StrategicAdvisorBackend

REM Start/stop tunnel
net start cloudflared
net stop cloudflared

REM Run watchdog manually
powershell -File Watchdog.ps1
```

## Prerequisites

- Node.js installed
- `npm install` already run in the project
- `.env.backend` configured
- Cloudflare tunnel previously set up (run `Install-TunnelService.ps1` first if needed)

## Laptop Setup

- Keep the laptop plugged in and connected to the network
- Configure power settings so it does not sleep while plugged in
- Ensure the laptop stays on the network 24/7
