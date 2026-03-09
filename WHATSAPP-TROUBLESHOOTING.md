# WhatsApp Webhook Troubleshooting

## Step 1: Fix tunnel config (run as Administrator)

The tunnel needs explicit hostname routing. Run:

```powershell
# Right-click PowerShell > Run as Administrator
cd c:\Users\deepe\strategic-coworker-app
powershell -ExecutionPolicy Bypass -File .\FIX-TUNNEL-CONFIG.ps1
```

## Step 2: Check Twilio Debugger

1. Go to: **https://console.twilio.com/us1/monitor/logs/debugger**
2. Send a WhatsApp message to +1 415 523 8886
3. In the Debugger, find the webhook request for your message
4. Check the **Response** - what status code did Twilio receive? Any error?

This tells you if Twilio reached your URL and what response it got.

## Step 3: Verify setup

| Check | How |
|-------|-----|
| Backend running | `http://localhost:3000/health` should return JSON |
| Tunnel service | `sc query cloudflared` - Status should be RUNNING |
| Twilio webhook URL | `https://webhook.lobstermoltys.com/webhook/whatsapp` |
| Twilio method | POST |

## Step 4: Test from browser

Open in browser: **https://webhook.lobstermoltys.com/webhook/whatsapp**

You should see: `{"status":"ok","message":"Webhook endpoint is reachable..."}`

If you get an error or timeout, the tunnel isn't routing correctly.

## Step 5: Backend logs

When you send a WhatsApp message, the backend window should show:
```
📥 Webhook received from Twilio: whatsapp:+17324214636
```

If you DON'T see this, Twilio's request isn't reaching your backend.
