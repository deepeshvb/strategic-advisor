# Check Twilio Debugger - Find Out Why Webhook Fails

## Step 1: Open Twilio Debugger

Go to: **https://console.twilio.com/us1/monitor/logs/debugger**

## Step 2: Send a WhatsApp Message

Send "hello" to +1 415 523 8886 from your WhatsApp.

## Step 3: Find the Webhook Event

In the Debugger list, look for an event related to your message. It might be labeled:
- "Webhook to your application"
- "Incoming message"
- Or show your webhook URL

Click on it to open details.

## Step 4: Check the Response

Look for:
- **HTTP Status** - Did Twilio get 200? Or an error (404, 500, timeout)?
- **Error message** - Any specific error?
- **Request URL** - Is it correct? `https://webhook.lobstermoltys.com/webhook/whatsapp`

## What the Errors Mean

| Error | Likely Cause |
|-------|--------------|
| **Connection refused / Timeout** | Tunnel not reachable – URL wrong or tunnel down |
| **404 Not Found** | Wrong path – should end with `/webhook/whatsapp` |
| **500 Server Error** | Backend crashed or error in our code |
| **SSL/TLS error** | Certificate or HTTPS issue |

## Share the Result

After checking, note:
- The HTTP status code Twilio received
- Any error message shown
- A screenshot if possible

This will tell us exactly what's failing.
