# Quick Start - Get Your AI Advisor Running in 10 Minutes

## ✅ What You Need:

1. **Twilio Account** (free trial, $15 credit)
2. **Your phone: +18556406324** (already configured!)
3. **10 minutes**

---

## 🚀 Setup Steps

### 1. Sign Up for Twilio (2 min)

Go to: **https://www.twilio.com/try-twilio**

- Email: deepesh.vellore@jerseytechpartners.com
- Verify your phone: +18556406324

### 2. Get Credentials (1 min)

In Twilio Console, copy:
- **Account SID** (starts with AC...)
- **Auth Token** (click eye icon to reveal)
- **Phone Number** (click "Get a trial phone number")

### 3. Enable WhatsApp (2 min)

1. Go to: **Messaging** → **Try it out** → **Send a WhatsApp message**
2. You'll see: "Send **join [code]** to **+1 415 523 8886**"
3. **On your iPhone**, open WhatsApp
4. Start a chat with: **+1 415 523 8886**
5. Send: **"join [your-code]"** (use the code from Twilio)
6. You'll get: "You are all set!"

### 4. Configure Backend (2 min)

Open: `c:\Users\deepe\strategic-coworker-app\.env.backend`

Update these lines:
```env
TWILIO_ACCOUNT_SID=AC...your_sid_here...
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio number
```

**Save the file.**

### 5. Start the Service (1 min)

```batch
cd c:\Users\deepe\strategic-coworker-app
.\START-BACKEND.bat
```

Keep this window open!

### 6. Test It! (2 min)

**On your iPhone**, in WhatsApp (to +1 415 523 8886):

1. Type: **"hello"**
2. Wait 5-10 seconds
3. You should get an AI response!

Try:
- **"brief"** - Current status
- **"critical"** - Urgent items
- **"call"** - Request voice briefing
- **Any question** - AI will answer

---

## ✅ Success!

You now have a 24/7 AI advisor that:
- ✅ Monitors all channels every 15 minutes
- ✅ Sends WhatsApp alerts for urgent items
- ✅ Sends SMS for critical issues only
- ✅ Emails daily summaries (8 AM & 6 PM)
- ✅ Makes voice calls for emergencies
- ✅ Responds to your WhatsApp questions 24/7

---

## 🔄 Daily Operation

### Keep the laptop:
- ✅ Plugged in
- ✅ Connected to internet
- ✅ Backend service running (START-BACKEND.bat window open)

### You can:
- Text questions via WhatsApp anytime
- Get proactive alerts for urgent issues
- Receive daily email summaries
- Request voice briefings on demand

---

## 📱 Your Setup:

- **Your Phone:** +18556406324
- **WhatsApp To:** +1 415 523 8886 (Twilio sandbox)
- **Email:** deepesh.vellore@jerseytechpartners.com
- **Backend:** Running on laptop 24/7

---

## 🆘 Need Help?

If something doesn't work:
1. Check `.env.backend` has correct credentials
2. Make sure WhatsApp sandbox is joined
3. Check backend logs for errors
4. Restart: `.\START-BACKEND.bat`

**Questions?** Just ask! I'm here to help get this running.
