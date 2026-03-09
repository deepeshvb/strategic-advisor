# Voice Note – No Response Troubleshooting

When you send a voice note and get **no acknowledgement or response**, the webhook is likely not reaching your backend.

---

## Quick Checks

### 1. Verify webhook is reachable from the internet

Open in a browser (or curl):

```
https://webhook.lobstermoltys.com/webhook/whatsapp
```

**Expected:** JSON like `{"status":"ok","message":"Webhook endpoint is reachable..."}`

**If it fails (timeout, error):** The tunnel is not routing to your backend. See Step 3.

---

### 2. Verify Twilio webhook URL

1. Go to: https://www.twilio.com/console/sms/whatsapp/sandbox
2. Check **"When a message comes in"** is exactly:
   ```
   https://webhook.lobstermoltys.com/webhook/whatsapp
   ```
3. Method: **POST**
4. Click **Save**

---

### 3. Verify tunnel routes to backend (port 3000)

The tunnel must route `webhook.lobstermoltys.com` → `http://localhost:3000`.

**Check the tunnel config** (run in PowerShell as Admin):

```powershell
Get-Content "C:\Windows\System32\config\systemprofile\.cloudflared\config.yml"
```

**Expected:**
```yaml
ingress:
  - hostname: webhook.lobstermoltys.com
    service: http://localhost:3000
```

**If it points to port 5173 instead:** The tunnel is routing to the frontend. For webhooks to work, it must point to **port 3000** (backend). Re-run `Install-TunnelService.ps1` as Admin to fix.

---

### 4. Restart tunnel and backend

```powershell
# Restart tunnel
net stop cloudflared
net start cloudflared

# Restart backend
powershell -ExecutionPolicy Bypass -File .\RESTART-BACKEND-FOR-VOICE.ps1
```

---

### 5. Test send path (optional)

If the webhook URL works (Step 1), test that WhatsApp sending works:

```
https://webhook.lobstermoltys.com/api/test/send-voice-ack
```

You should receive "Got it, transcribing your voice note..." on WhatsApp.

---

### 6. Rejoin Twilio sandbox (if needed)

**If you receive the webhook but get no reply:** Sandbox membership expires every 72 hours. Twilio will not deliver our replies if your number is not in the sandbox. Send to +1 415 523 8886:

```
join <your-sandbox-name>
```

Get the sandbox name from the [Twilio WhatsApp sandbox](https://www.twilio.com/console/sms/whatsapp/sandbox) page.

---

## Summary

| Symptom | Likely cause |
|---------|--------------|
| Step 1 URL fails | Tunnel down or wrong config |
| Step 1 works, no response to voice | Twilio URL wrong, or sandbox disconnected |
| Step 1 works, send-voice-ack works | Webhook receives but voice processing fails (check backend logs) |
