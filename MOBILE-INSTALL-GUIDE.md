# 📱 Mobile Installation & Testing Guide

## Quick Start

### Step 1: Ensure Same WiFi Network
- Your computer and phone must be on the **same WiFi network**
- Both devices need to be on the same local network

### Step 2: Start the App for Network Access
Run this command:
```powershell
.\LAUNCH-ON-NETWORK.bat
```

This will:
- Configure Vite to allow network access
- Display your local IP address
- Start the server accessible from your phone

### Step 3: Open on Your Phone
Open your phone's browser and go to:
```
http://10.1.10.93:5173
```

**Alternative - Create QR Code:**
1. Go to: https://qr-code-generator.com
2. Enter: `http://10.1.10.93:5173`
3. Generate QR code
4. Scan with your phone camera

---

## 📲 Install as App on Phone

### Android (Chrome):
1. Open `http://10.1.10.93:5173` in Chrome
2. Tap menu (⋮) in top right
3. Tap **"Install app"** or **"Add to Home Screen"**
4. Name it: "Strategic Advisor"
5. Tap "Add" or "Install"
6. ✅ Icon appears on home screen!

### iPhone (Safari):
1. Open `http://10.1.10.93:5173` in Safari
2. Tap **Share** button (□↑) at bottom
3. Scroll and tap **"Add to Home Screen"**
4. Name it: "Strategic Advisor"
5. Tap "Add"
6. ✅ Icon appears on home screen!

---

## 🔔 Enable Notifications

### First Time Setup:
1. After installing, open the app from home screen
2. You'll see notification permission popup
3. **Tap "Allow"**
4. ✅ Test notification appears: "Background Monitoring Active"

### What You'll Get Notified About:
- 🚨 **Critical alerts** - Immediate CEO action needed
- ⚠️ **High priority** - Important items within 24h
- 🌅 **8 AM** - Morning briefing available
- 📊 **5 PM** - End of day summary

---

## 🧪 Test Mobile Features

### Test 1: Mobile UI
1. Open app on phone
2. ✅ Should see bottom navigation bar
3. ✅ Touch-friendly buttons
4. ✅ Full-screen chat interface
5. ✅ Smooth scrolling

### Test 2: Voice Control
1. Tap microphone button (🎤)
2. Say: **"What's urgent?"**
3. ✅ Auto-submits without typing
4. ✅ Voice response plays back
5. Say: **"Stop"** to interrupt

### Test 3: PWA Features
1. Add to home screen (see instructions above)
2. Launch from home screen icon
3. ✅ Opens in standalone mode (no browser UI)
4. ✅ Looks like native app
5. ✅ Theme color in status bar

### Test 4: Background Monitoring
1. Open app from home screen
2. Grant notification permission
3. Lock your phone screen
4. Wait a few minutes
5. ✅ Should get notifications even with screen locked

### Test 5: Brief Mode
1. Open app
2. Tap microphone
3. Say: **"Give me a brief update"**
4. ✅ Should get concise 3-4 bullet point summary
5. Perfect for CEO on-the-go!

---

## 🔧 Troubleshooting

### "Site can't be reached" on phone:
1. **Check WiFi:** Both devices on same network?
2. **Check firewall:** Windows Firewall might be blocking
   - Control Panel → Windows Defender Firewall
   - Allow an app → Node.js → Check both Private and Public
3. **Try different IP:** Run `ipconfig` again if IP changed

### "Add to Home Screen" not showing:
1. **Android:** Use Chrome browser (not Firefox/others)
2. **iOS:** Must use Safari browser
3. **Check manifest:** Look in F12 → Application → Manifest for errors

### Notifications not working:
1. **Check permission:** Settings → Apps → Strategic Advisor → Notifications
2. **Test manually:** Open browser console, run:
   ```javascript
   new Notification('Test', {body: 'Testing notifications'});
   ```
3. **Re-grant permission:** Clear site data and reload

### Slow on mobile:
1. **Use Brief mode:** Say "quick update" instead of full briefing
2. **Check LLM mode:** Hybrid or Cloud API is faster on mobile than Local
3. **Limit voice length:** Responses are capped at 500 chars for voice

---

## 📊 Mobile Performance Tips

### Best Practices:
1. **Use Brief mode** for quick updates
2. **Enable Hybrid mode** for faster responses (sensitive data stays local)
3. **Voice control** works great for hands-free CEO use
4. **Background monitoring** keeps you informed without opening app
5. **Lock screen** and let it work - get notified for urgent items

### Mobile-Optimized Queries:
- "What's urgent?" ← Quick, focused
- "Brief me" ← CEO summary mode
- "What am I missing?" ← Blind spots only
- "Top 3 priorities" ← Actionable list

---

## 🚀 Your Mobile CEO Workflow

### Morning:
1. **8 AM notification** on phone: "Morning Briefing Available"
2. **Tap notification** - app opens
3. **Say:** "Brief me"
4. **Listen** to 60-second summary while getting coffee
5. **Take action** on critical item

### During Day:
1. **Push alert:** "🚨 Engineering conflict detected"
2. **Tap to open**
3. **Review details**
4. **Say:** "What should I do?"
5. **Follow recommendation**

### Evening:
1. **5 PM notification:** "End of Day Summary"
2. **Quick review** of outcomes
3. **Plan tomorrow**
4. **Lock phone** - monitoring continues overnight

---

## 🎯 Ready to Test!

Run this command now:
```powershell
.\LAUNCH-ON-NETWORK.bat
```

Then open on your phone:
```
http://10.1.10.93:5173
```

And follow the installation steps above!

---

## 📸 What to Expect

**On Phone Browser:**
- Clean, mobile-optimized interface
- Bottom navigation bar for thumb access
- Large, touch-friendly buttons
- Voice control works perfectly

**Installed as App:**
- Native app appearance
- No browser chrome
- Faster launch
- Home screen icon
- Push notifications

---

Let me know when you've opened it on your phone and I'll help you test each feature! 📱✨
