# 🎤 Siri Voice API - Complete Setup Guide

## ✅ What's Been Implemented

Your Strategic Advisor now has **voice API endpoints** that Siri can call!

### Available Endpoints:

```
GET  http://localhost:3001/api/voice/critical
     → Returns critical items as speakable text

GET  http://localhost:3001/api/voice/summary
     → Returns daily briefing

GET  http://localhost:3001/api/voice/status
     → Returns system status

POST http://localhost:3001/api/voice/query
     → Process any natural language query

GET  http://localhost:3001/api/voice/briefing/morning
     → Morning briefing (also: midday, evening)
```

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Start Voice API Server

**On your laptop:**

```powershell
# Option A: Start just Voice API
.\START-VOICE-API.bat

# Option B: Start everything at once (recommended)
.\START-ALL-SERVICES.bat
```

**Keep these windows open 24/7!**

### Step 2: Test Locally

```powershell
# Test critical items endpoint
curl http://localhost:3001/api/voice/critical

# Should return:
# {"text": "You have 2 critical items...", "priority": "critical"}
```

### Step 3: Get Ngrok URL for Voice API

**Your ngrok URL for the main app:**
```
https://closefisted-felice-hamamelidaceous.ngrok-free.dev
```

**For Voice API, we need to expose port 3001 too:**

```powershell
# In a new terminal
.\ngrok.exe http 3001
```

**Get the URL** (looks like: `https://abc123.ngrok-free.dev`)  
**Save this - you'll use it in Siri shortcuts!**

---

## 📱 Create Siri Shortcuts

### Shortcut 1: "What's Critical?"

**Setup:**

1. **Shortcuts app** → **"+"** button
2. **Add Action** → **"Get Contents of URL"**
   - URL: `https://YOUR-NGROK-URL-PORT-3001/api/voice/critical`
   - Method: GET
3. **Add Action** → **"Get Dictionary Value"**
   - Key: `text`
   - Dictionary: Contents of URL
4. **Add Action** → **"Speak Text"**
   - Text: Dictionary Value
5. **Name**: "What's Critical"
6. **Add to Siri**: "What's critical"

**Usage:**
```
"Hey Siri, what's critical?"
→ Siri speaks: "You have 2 critical items: customer escalation and engineering deploy."
```

### Shortcut 2: "Strategic Update"

**Setup:**

1. **Shortcuts app** → **"+"**
2. **Get Contents of URL**
   - URL: `https://YOUR-NGROK-URL-PORT-3001/api/voice/summary`
3. **Get Dictionary Value** → Key: `text`
4. **Speak Text** → Dictionary Value
5. **Name**: "Strategic Update"
6. **Add to Siri**: "Strategic update"

**Usage:**
```
"Hey Siri, strategic update"
→ Siri speaks your daily briefing
```

### Shortcut 3: "System Status"

**Setup:**

1. **Shortcuts app** → **"+"**
2. **Get Contents of URL**
   - URL: `https://YOUR-NGROK-URL-PORT-3001/api/voice/status`
3. **Get Dictionary Value** → Key: `text`
4. **Speak Text** → Dictionary Value
5. **Name**: "System Status"
6. **Add to Siri**: "System status"

**Usage:**
```
"Hey Siri, system status"
→ Siri speaks current monitoring status
```

### Shortcut 4: "Morning Briefing"

**Setup:**

1. **Shortcuts app** → **"+"**
2. **Get Contents of URL**
   - URL: `https://YOUR-NGROK-URL-PORT-3001/api/voice/briefing/morning`
3. **Get Dictionary Value** → Key: `text`
4. **Speak Text** → Dictionary Value
5. **Name**: "Morning Briefing"
6. **Add to Siri**: "Morning briefing"

**Usage:**
```
"Hey Siri, morning briefing"
→ Comprehensive morning briefing
```

---

## ⏰ Scheduled Voice Announcements

### Automatic Briefings

**iOS Shortcuts Automation:**

1. **Shortcuts app** → **Automation** tab
2. **"+"** → **Time of Day**
3. **Time**: 8:00 AM
4. **Repeat**: Daily
5. **Add Action** → **Run Shortcut**
6. **Select**: "Morning Briefing"
7. **Disable "Ask Before Running"**
8. **Done**

**Repeat for:**
- 8:00 AM → Morning Briefing
- 12:00 PM → Midday Check-in (use `/briefing/midday`)
- 5:00 PM → Evening Summary (use `/briefing/evening`)

**Result:**
```
Your phone automatically speaks briefings at scheduled times!
No interaction needed - just works.
```

---

## 🔧 Advanced Shortcuts

### Ask Any Question

**Natural Language Query:**

1. **Shortcuts app** → **"+"**
2. **Add Action** → **Ask for Input**
   - Prompt: "What would you like to know?"
3. **Add Action** → **Get Contents of URL**
   - URL: `https://YOUR-NGROK-URL-PORT-3001/api/voice/query`
   - Method: POST
   - Request Body: JSON
   - Add field: `query` = Provided Input
4. **Get Dictionary Value** → Key: `text`
5. **Speak Text** → Dictionary Value
6. **Name**: "Ask Strategic Advisor"
7. **Add to Siri**: "Ask advisor"

**Usage:**
```
"Hey Siri, ask advisor"
Siri: "What would you like to know?"
You: "Any urgent issues?"
Siri: "You have 2 critical items requiring attention..."
```

---

## 🎯 Complete Voice Commands

Once set up, you can say:

```
"Hey Siri, what's critical?"
"Hey Siri, strategic update"
"Hey Siri, system status"
"Hey Siri, morning briefing"
"Hey Siri, ask advisor"
```

**All work from anywhere - no app opening required!**

---

## 🌐 Remote Access Setup

### Expose Voice API via Ngrok

**Method 1: Two Separate Tunnels**

```powershell
# Terminal 1: Main app
ngrok http 5173

# Terminal 2: Voice API
ngrok http 3001
```

**Get both URLs:**
- App: `https://abc123.ngrok-free.dev`
- API: `https://def456.ngrok-free.dev`

**Use API URL in Siri shortcuts.**

### Method 2: Proxy Through Main App (Future)

Configure Vite to proxy `/api/voice/*` to port 3001.
Then you only need one ngrok tunnel.

---

## 🧪 Testing Your Setup

### Test 1: Local API

```powershell
# Test each endpoint locally
curl http://localhost:3001/api/voice/critical
curl http://localhost:3001/api/voice/summary
curl http://localhost:3001/api/voice/status

# Test query
curl -X POST http://localhost:3001/api/voice/query -H "Content-Type: application/json" -d "{\"query\":\"what's critical\"}"
```

### Test 2: Remote API (via Ngrok)

```powershell
# Replace with YOUR ngrok URL for port 3001
curl https://YOUR-NGROK-URL/api/voice/critical
```

### Test 3: Siri Shortcut

1. Create simple "What's Critical" shortcut
2. Test: "Hey Siri, what's critical"
3. Should hear Siri speak the response

---

## 📊 Example Responses

### Critical Items:
```json
{
  "text": "You have 2 critical items: 1. Customer escalation from ABC Corp. 2. Engineering deploy blocked.",
  "priority": "critical",
  "itemCount": 2
}
```

### Daily Summary:
```json
{
  "text": "Good morning. You have 2 critical items and 5 high-priority items requiring attention today.",
  "priority": "critical",
  "itemCount": 7
}
```

### System Status:
```json
{
  "text": "System status: Monitoring is active. Tracking 3 companies. Last update: 2 minutes ago.",
  "priority": "normal"
}
```

---

## 🎓 Pro Tips

### Tip 1: Use Descriptive Siri Phrases

Instead of generic names, use natural phrases:
- "What's critical today"
- "Give me a strategic update"
- "Check my system status"
- "Morning briefing please"

### Tip 2: Create Contextual Shortcuts

**Morning routine:**
```
Shortcut: "Start My Day"
→ Get morning briefing
→ Get weather
→ Read calendar
→ Speak combined summary
```

**Before important call:**
```
Shortcut: "Brief Me"
→ Get critical items
→ Get relevant customer data
→ Speak quick summary
```

### Tip 3: Use Automation Triggers

**Location-based:**
- Arrive at office → Morning briefing
- Leave office → Evening summary

**Time-based:**
- Every hour → Check critical items
- Every 4 hours → Full update

---

## 🆘 Troubleshooting

### "Siri can't reach the server"

**Check:**
1. Voice API running? `http://localhost:3001/api/voice/health`
2. Ngrok tunnel active? Check ngrok window
3. URL correct in shortcut? Must be ngrok URL, not localhost

### "Shortcut runs but Siri doesn't speak"

**Fix:**
1. Ensure "Speak Text" action is last in shortcut
2. Check iPhone volume is up
3. Test "Speak Text" action alone with static text

### "Response is JSON instead of text"

**Missing step:**
Add "Get Dictionary Value" → Key: `text` before "Speak Text"

### "Works on WiFi but not cellular"

**Issue:** Ngrok URL needs to be clicked through on cellular  
**Fix:** Visit ngrok URL in Safari on cellular, click "Visit Site" once

---

## 🎉 What You Can Do Now

With Voice API implemented:

✅ **Ask questions via Siri** (anywhere, any time)  
✅ **Get spoken responses** (no app opening)  
✅ **Schedule automatic briefings** (hands-free)  
✅ **Query your monitoring system** (voice-first)  
✅ **True CEO intelligence assistant** (AGI-powered voice)  

---

## 🚀 Next Steps

### Immediate:
1. Start Voice API: `.\START-ALL-SERVICES.bat`
2. Start second ngrok tunnel for port 3001
3. Create "What's Critical" Siri shortcut
4. Test: "Hey Siri, what's critical"

### This Week:
1. Create all 4 basic shortcuts
2. Set up scheduled automations
3. Test from different locations
4. Refine based on usage

### Future Enhancements:
- Connect to real monitoring data
- Add more intelligent query processing
- Implement voice command authentication
- Add multi-company support

---

## 📞 Quick Reference

**Start Services:**
```powershell
.\START-ALL-SERVICES.bat
```

**Test API:**
```
http://localhost:3001/api/voice/health
```

**Ngrok for API:**
```powershell
ngrok http 3001
```

**Essential Siri Commands:**
- "Hey Siri, what's critical?"
- "Hey Siri, strategic update"
- "Hey Siri, system status"

---

**Your voice-first CEO intelligence system is now operational!** 🎤🤖📱
