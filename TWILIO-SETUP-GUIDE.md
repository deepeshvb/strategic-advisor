# Twilio Setup Guide - WhatsApp, SMS, and Voice

**Time Required:** 5-10 minutes  
**Cost:** Free trial with $15 credit, then ~$2/month

---

## 🎯 What You'll Get

After setup, your Strategic AI Advisor will be able to:
- ✅ Send/receive WhatsApp messages
- ✅ Send SMS for critical alerts
- ✅ Make voice calls for emergencies
- ✅ Respond to your questions 24/7

---

## Step 1: Create Twilio Account (2 minutes)

1. Go to: **https://www.twilio.com/try-twilio**
2. Click **"Start for free"**
3. Fill in:
   - Email: deepesh.vellore@jerseytechpartners.com
   - Password: (create a strong password)
4. Verify your email
5. **Verify your personal phone number: +18556406324**
   - Twilio will send you a verification code
   - Enter the code to verify

---

## Step 2: Get Your Credentials (1 minute)

After signing up, you'll be on the Twilio Console dashboard:

1. You'll see:
   - **Account SID**: Starts with "AC..." (copy this)
   - **Auth Token**: Click to reveal, then copy

2. **Copy these values** - you'll need them in Step 4

---

## Step 3: Get a Phone Number (2 minutes)

1. In Twilio Console, click **"Get a trial phone number"**
2. Twilio will assign you a free number (e.g., +1234567890)
3. **Copy this number** - you'll need it in Step 4

---

## Step 4: Enable WhatsApp Sandbox (2 minutes)

1. In Twilio Console, go to: **Messaging** → **Try it out** → **Send a WhatsApp message**
2. You'll see instructions like:
   ```
   Join your sandbox by sending:
   "join <code>"
   to: +1 415 523 8886
   ```

3. **On your iPhone**:
   - Open WhatsApp
   - Send a message to: **+1 415 523 8886**
   - Type: **"join [your-code]"** (use the code from Twilio console)
   - You'll get a confirmation message

4. **Your WhatsApp is now connected!**

---

## Step 5: Configure the Backend (1 minute)

Open the file: `c:\Users\deepe\strategic-coworker-app\.env.backend`

Replace these placeholders:

```env
# From Step 2 (Twilio Console)
TWILIO_ACCOUNT_SID=AC1234567890abcdef  # ← Your Account SID
TWILIO_AUTH_TOKEN=your_auth_token_here   # ← Your Auth Token

# From Step 3 (Your Twilio phone number)
TWILIO_PHONE_NUMBER=+1234567890          # ← Your Twilio number

# WhatsApp sandbox number (use this exactly)
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Gmail setup (for daily email summaries)
GMAIL_USER=your-email@gmail.com          # ← Your Gmail
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   # ← Gmail app password
```

### How to Get Gmail App Password:

1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer"
3. Click "Generate"
4. Copy the 16-character password

---

## Step 6: Start the Backend Service (1 minute)

```batch
cd c:\Users\deepe\strategic-coworker-app
.\START-BACKEND.bat
```

You should see:
```
============================================
  STRATEGIC AI ADVISOR - BACKEND SERVICE
============================================

🚀 Starting 24/7 AGI Monitoring Service...
📊 Monitoring interval: 15 minutes
✅ Monitoring service started successfully!

✅ Backend server running on port 3000
🤖 AGI Monitoring Service is now active!
📱 You can now text or WhatsApp: +18556406324
```

---

## Step 7: Test It! (2 minutes)

### Test WhatsApp:
1. On your iPhone, open WhatsApp
2. Go to the conversation with **+1 415 523 8886** (Twilio sandbox)
3. Type: **"hello"**
4. You should get an AI response within 5-10 seconds!

### Test Commands:
- `"brief"` - Get current status
- `"critical"` - Show urgent items
- `"call"` - Request a voice briefing
- `"help"` - See all commands

### Test SMS (Critical Alerts):
The system will automatically send SMS only when it detects truly critical issues (urgency 9+).

---

## 🎉 Success Criteria

After setup, you should:
1. ✅ Receive a WhatsApp message saying "Strategic AI Advisor is now online!"
2. ✅ Be able to text questions and get AI responses
3. ✅ Receive morning briefing at 8 AM (email + WhatsApp)
4. ✅ Get SMS alerts only for critical issues
5. ✅ Service runs 24/7 in the background

---

## 📊 Costs

### Free Trial:
- $15 credit (enough for ~3000 WhatsApp messages!)

### After Trial (~$2.30/month):
- Base fee: $1.15/month
- WhatsApp: $0.005 per message (~100/month = $0.50)
- SMS: $0.0075 per message (~20/month = $0.15)
- Voice: $0.013/minute (~5 calls = $0.50)

### Claude AI:
- Pay-as-you-go: ~$5-10/month for 24/7 monitoring

---

## 🆘 Troubleshooting

### "Twilio credentials not configured"
- Check `.env.backend` has correct TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
- Restart the backend service

### "WhatsApp not working"
- Make sure you joined the sandbox: send "join [code]" to +1 415 523 8886
- Check you're using the correct sandbox number in .env.backend

### "No response from AI"
- Check that ANTHROPIC_API_KEY is set in .env.backend
- Check backend logs for errors

### Need Help?
Check the logs in: `c:\Users\deepe\strategic-coworker-app\logs\monitoring.log`

---

## 🚀 Next: Production Setup

After testing works, you can:
1. **Install as Windows Service** (auto-start on boot)
2. **Get Production WhatsApp** (requires Business API approval)
3. **Configure Real Channel Integrations** (Teams, Email APIs)

---

**Ready to start?** Follow Step 1 and sign up for Twilio!
