# WhatsApp No Response - Diagnostic Checklist

If you're not receiving any response (including error/timeout messages), work through these steps:

## 1. Test Webhook Reachability

Open in your browser: **https://webhook.lobstermoltys.com/webhook/whatsapp**

- **If you see JSON** (`{"status":"ok",...}`): Backend + tunnel are reachable ✅
- **If it times out or errors**: Tunnel or backend is down. Check:
  - Is Cloudflare tunnel (cloudflared) running? `Get-Service cloudflared`
  - Is the backend running? `Get-ScheduledTask StrategicAdvisorBackend` (State should be Running)

## 2. Twilio WhatsApp Sandbox - MUST Join First

You **must** join the sandbox before you can receive messages:

1. Go to: https://www.twilio.com/console/sms/whatsapp/sandbox
2. Find the "Join" instruction (e.g. send `join <word>` to +1 415 523 8886)
3. From your WhatsApp, send that exact message to the sandbox number
4. You should see "You're all set!" in Twilio

**Without joining**, Twilio will reject our outbound messages. You won't get any reply.

## 3. Twilio Webhook URL

1. Go to: https://www.twilio.com/console/sms/whatsapp/sandbox
2. Under "When a message comes in", verify: `https://webhook.lobstermoltys.com/webhook/whatsapp`
3. Method: **HTTP POST**
4. Save

## 4. Immediate Acknowledgment (New)

The backend now sends **"Got it, processing your request..."** as soon as it receives your message.

- **If you get that message**: Webhook works, delivery works. The delay is in channel fetch + Claude.
- **If you don't get it**: Either webhook isn't reached, or Twilio can't deliver to your number (sandbox not joined).

## 5. Restart Backend

```powershell
Stop-ScheduledTask -TaskName StrategicAdvisorBackend
Start-Sleep -Seconds 5
Start-ScheduledTask -TaskName StrategicAdvisorBackend
```

## 6. Twilio Logs

Check https://console.twilio.com/us1/monitor/logs/debugger

- Look for webhook requests to your URL
- Look for errors when we try to send messages (e.g. 21608 = recipient not in sandbox)
