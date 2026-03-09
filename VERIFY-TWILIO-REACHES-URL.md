# Verify Twilio Can Reach Your URL

If the webhook still fails, this test confirms whether Twilio can reach **any** URL.

## Step 1: Get a test URL

1. Go to: **https://webhook.site**
2. You'll see a unique URL like: `https://webhook.site/abc-123-xyz`
3. **Copy that URL**

## Step 2: Put it in Twilio

1. Go to: https://www.twilio.com/console/sms/whatsapp/sandbox
2. Set **"When a message comes in"** to your webhook.site URL
3. Save

## Step 3: Send WhatsApp message

Send "hello" to +1 415 523 8886

## Step 4: Check webhook.site

On the webhook.site page, you should see the request from Twilio appear.

### What it means:

- **Request appeared** → Twilio CAN reach URLs. The issue is with our tunnel/backend.
- **No request** → Twilio isn't reaching the URL. Possible causes:
  - Wrong URL in Twilio
  - Webhook not saved
  - Twilio region/network issue

## Step 5: Restore your webhook URL

Put back: `https://webhook.lobstermoltys.com/webhook/whatsapp` (or your current tunnel URL)
