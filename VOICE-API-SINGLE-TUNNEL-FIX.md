# ✅ Voice API Fixed - Single Tunnel Solution

## Problem
Ngrok free tier only allows **one tunnel at a time**.

## Solution
**Proxy Voice API through main dev server** - no second tunnel needed!

---

## 🎯 How It Works Now

**Before (Didn't Work):**
```
Port 5173 → Ngrok Tunnel 1 → Main App
Port 3001 → Ngrok Tunnel 2 → Voice API ❌ (blocked - only 1 tunnel allowed)
```

**After (Fixed):**
```
Port 5173 → Ngrok Tunnel → Main App + Voice API ✅
                         ↓
                    /api/voice/* → Proxied to port 3001
```

**Single ngrok tunnel serves EVERYTHING!**

---

## 🚀 Your Siri Shortcuts URLs

**Use your existing ngrok URL for ALL endpoints:**

```
Main App:
https://closefisted-felice-hamamelidaceous.ngrok-free.dev

Voice API (proxied through same URL):
https://closefisted-felice-hamamelidaceous.ngrok-free.dev/api/voice/critical
https://closefisted-felice-hamamelidaceous.ngrok-free.dev/api/voice/summary
https://closefisted-felice-hamamelidaceous.ngrok-free.dev/api/voice/status
https://closefisted-felice-hamamelidaceous.ngrok-free.dev/api/voice/query
```

**Same URL, different endpoints!**

---

## 📱 Create Siri Shortcut Now

### **"What's Critical?" Shortcut:**

**On iPhone (Shortcuts app):**

1. **Tap "+"** button
2. **Add Action** → "Get Contents of URL"
   - URL: `https://closefisted-felice-hamamelidaceous.ngrok-free.dev/api/voice/critical`
   - Method: GET
3. **Add Action** → "Get Dictionary Value"
   - Key: `text`
   - Dictionary: Contents of URL
4. **Add Action** → "Speak Text"
   - Text: Dictionary Value
5. **Tap "..."** → Rename: "What's Critical"
6. **Add to Siri** → Say: "What's critical"
7. **Done!**

**Test:**
```
"Hey Siri, what's critical?"
→ Siri speaks: "You have 2 critical items..."
```

---

## ✅ What You Need to Do

### **Step 1: Restart Dev Server** (Apply Proxy Config)

**Stop current dev server** (Ctrl+C in that terminal)

**Start again:**
```powershell
npm run dev
```

Wait for: `Local: http://localhost:5173`

### **Step 2: Keep Voice API Running**

**Voice API should still be running** in another terminal.  
If not, start it:
```powershell
npm run api
```

### **Step 3: Test Proxy Works**

**From your laptop browser:**
```
http://localhost:5173/api/voice/critical
```

Should show JSON response! ✅

### **Step 4: Test via Ngrok**

**From mobile (cellular):**
```
https://closefisted-felice-hamamelidaceous.ngrok-free.dev/api/voice/critical
```

Should show same JSON response! ✅

---

## 🎤 All Siri Shortcuts (Copy-Paste URLs)

Use your ngrok URL with these paths:

```
Critical Items:
https://closefisted-felice-hamamelidaceous.ngrok-free.dev/api/voice/critical

Daily Summary:
https://closefisted-felice-hamamelidaceous.ngrok-free.dev/api/voice/summary

System Status:
https://closefisted-felice-hamamelidaceous.ngrok-free.dev/api/voice/status

Morning Briefing:
https://closefisted-felice-hamamelidaceous.ngrok-free.dev/api/voice/briefing/morning

Midday Check:
https://closefisted-felice-hamamelidaceous.ngrok-free.dev/api/voice/briefing/midday

Evening Summary:
https://closefisted-felice-hamamelidaceous.ngrok-free.dev/api/voice/briefing/evening
```

**All work through your single ngrok tunnel!**

---

## 🔧 Quick Setup Commands

**Terminal 1: Dev Server (with proxy)**
```powershell
npm run dev
```

**Terminal 2: Voice API**
```powershell
npm run api
```

**Terminal 3: Ngrok (one tunnel for both)**
```powershell
ngrok http 5173
```

**That's it! Everything proxied through port 5173.**

---

## 🎯 What This Fixes

**Before:**
- ❌ Needed 2 ngrok tunnels
- ❌ Free tier blocks second tunnel
- ❌ Couldn't use Voice API remotely

**After:**
- ✅ Only need 1 ngrok tunnel
- ✅ Voice API accessible through main URL
- ✅ Works with free ngrok tier
- ✅ Siri shortcuts work from anywhere

---

## 📊 Architecture Now

```
iPhone (Anywhere)
      ↓
"Hey Siri, what's critical?"
      ↓
Siri Shortcut calls:
https://closefisted-felice-hamamelidaceous.ngrok-free.dev/api/voice/critical
      ↓
Ngrok Tunnel (single)
      ↓
Vite Dev Server :5173
      ↓
Proxy: /api/voice/* → localhost:3001
      ↓
Voice API Server :3001
      ↓
Voice Response Service
      ↓
Monitoring Data (AGI)
      ↓
Response: {"text": "You have 2 critical items..."}
      ↓
Siri Speaks It!
```

**Single tunnel, full functionality!**

---

## 🆘 If Ngrok Paid ($8/month)

**With paid ngrok, you CAN run multiple tunnels:**

```powershell
# Terminal 1: Main app
ngrok http 5173 --subdomain your-advisor

# Terminal 2: Voice API  
ngrok http 3001 --subdomain your-advisor-api
```

**Benefits:**
- Permanent subdomains
- No URL changes
- More professional

**But proxy solution works great with free tier!**

---

## ✅ Verification Steps

1. **Dev server running?** Check: http://localhost:5173
2. **Voice API running?** Check: http://localhost:3001/api/voice/health
3. **Proxy working?** Check: http://localhost:5173/api/voice/health
4. **Ngrok active?** Check ngrok window shows connections
5. **Remote working?** Check: https://YOUR-URL/api/voice/critical

If all ✅ → Create Siri shortcuts!

---

**Restart your dev server now, and the Voice API will be accessible through your existing ngrok URL!**
