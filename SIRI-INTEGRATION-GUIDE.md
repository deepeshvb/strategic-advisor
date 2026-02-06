# 🎤 Siri Integration Guide

## Enable "Hey Siri" Access to Your Strategic Advisor

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Install App on iPhone

1. Safari: `http://YOUR_LAPTOP_IP:5173`
2. Login with phone number
3. Share button → **"Add to Home Screen"**
4. Tap **"Add"**
5. ✅ App icon on home screen

### Step 2: Enable Siri Access

1. **iPhone Settings** → **Siri & Search**
2. Scroll down to **"Strategic Advisor"**
3. Toggle ON:
   - **Use with Siri**
   - **Suggestions in Search**
   - **Suggestions on Home Screen**
4. ✅ Siri can now open your app

### Step 3: Test Basic Command

Say: **"Hey Siri, open Strategic Advisor"**

✅ App should open instantly!

---

## 🎯 Advanced Siri Shortcuts

Create custom voice commands for specific actions:

### Shortcut 1: "What's Critical"

**Opens directly to critical items:**

1. Open **Shortcuts** app
2. Tap **"+"** (top right)
3. Tap **"Add Action"**
4. Search: **"Open App"**
5. Select **"Strategic Advisor"**
6. Tap **"+"** again
7. Search: **"Open URL"**
8. Enter: `http://YOUR_LAPTOP_IP:5173/?action=critical`
9. Tap **"..."** (top right) → **"Rename"**
10. Name: **"What's Critical"**
11. Toggle **"Show in Share Sheet"** OFF
12. Tap **"Done"**
13. Tap **"Add to Siri"**
14. Record phrase: **"What's critical"**
15. Tap **"Done"**

**Usage:**
```
"Hey Siri, what's critical"
→ Opens app showing critical items
```

### Shortcut 2: "Dashboard"

**Opens directly to dashboard:**

1. New Shortcut
2. Add **"Open URL"**
3. Enter: `http://YOUR_LAPTOP_IP:5173/?view=dashboard`
4. Name: **"Dashboard"**
5. Add to Siri: **"Show my dashboard"**

**Usage:**
```
"Hey Siri, show my dashboard"
→ Opens dashboard view
```

### Shortcut 3: "Morning Briefing"

**Gets your daily briefing:**

1. New Shortcut
2. Add **"Open URL"**
3. Enter: `http://YOUR_LAPTOP_IP:5173/?action=brief`
4. Name: **"Morning Briefing"**
5. Add to Siri: **"Morning briefing"**

**Usage:**
```
"Hey Siri, morning briefing"
→ Opens with today's briefing
```

### Shortcut 4: "Check Urgent"

**Opens chat and asks about urgent items:**

1. New Shortcut
2. Add **"Open App"** → Strategic Advisor
3. Add **"Wait"** → 3 seconds
4. Add **"Open URL"**
5. Enter: `http://YOUR_LAPTOP_IP:5173/?query=What%20are%20my%20urgent%20items`
6. Name: **"Check Urgent"**
7. Add to Siri: **"Check urgent items"**

**Usage:**
```
"Hey Siri, check urgent items"
→ Opens app and shows urgent items
```

---

## 🎙️ Voice Commands Inside App

Once app is open, use built-in voice input:

### How to Use:

1. Tap **microphone icon** 🎤
2. Speak your question
3. AI responds with voice

### Example Commands:

```
🎤 "What should I prioritize today?"
🔊 AI: "You have 3 critical items. First, respond to investor..."

🎤 "Summarize the board meeting"
🔊 AI: "The board meeting covered 4 main topics..."

🎤 "What's the production issue about?"
🔊 AI: "The CTO reported a database connection timeout..."

🎤 "Stop speaking"
🔊 [Stops immediately]

🎤 "What did the investor say?"
🔊 AI: "The investor email mentions series A funding..."
```

---

## 🔔 Background Notifications

### Enable Critical Alerts:

**iPhone Settings:**
1. **Settings** → **Notifications**
2. Scroll to **"Strategic Advisor"**
3. Toggle ON: **"Allow Notifications"**
4. Set **Alert Style**: **"Banners"** or **"Alerts"**
5. Toggle ON: **"Sounds"**
6. Toggle ON: **"Badges"**
7. **IMPORTANT**: Toggle ON **"Time Sensitive Notifications"**

**This allows critical alerts to:**
- ✅ Bypass Do Not Disturb
- ✅ Appear immediately
- ✅ Make sound even on silent
- ✅ Show on lock screen

---

## 🎯 Real-World Usage Examples

### Morning Routine:

**6:30 AM - While getting ready:**
```
🎤 "Hey Siri, morning briefing"
📱 App opens → Shows daily priorities
🔊 Voice announces: "Good morning. You have 2 critical items..."
```

### Driving to Work:

**8:00 AM - Hands-free in car:**
```
🎤 "Hey Siri, Strategic Advisor"
📱 App opens
🎤 "What's urgent today?"
🔊 AI: "You have one urgent email from the board chair..."
🎤 "What does it say?"
🔊 AI: "The email requests emergency meeting tomorrow at 2 PM..."
🎤 "Thanks, I'll handle it at the office"
```

### In Meeting:

**10:00 AM - Quick check during break:**
```
📳 Phone vibrates (critical alert)
🔊 Voice: "Critical alert. Production issue detected..."
👤 Excuse yourself
🎤 "Hey Siri, what's critical"
📱 Opens to issue details
👤 Call CTO to address
```

### Lunch Break:

**12:30 PM - Catch up on items:**
```
🎤 "Hey Siri, show my dashboard"
📱 Dashboard opens
👀 Review metrics
🎤 Tap microphone
🎤 "Summarize high priority items"
🔊 AI: "You have 3 high priority items..."
```

### Evening:

**5:00 PM - End of day:**
```
📱 Alert: "End of day intelligence"
🎤 "Hey Siri, Strategic Advisor"
🎤 "What needs my attention before EOD?"
🔊 AI: "One outstanding critical item about tomorrow's board meeting..."
```

---

## 🔧 Troubleshooting

### "Siri can't find Strategic Advisor"

**Fix:**
1. Settings → Siri & Search
2. Find "Strategic Advisor"
3. Toggle ON "Use with Siri"
4. If not listed, reinstall app from Safari

### Shortcuts Not Working

**Fix:**
1. Open Shortcuts app
2. Find your shortcut
3. Tap it to test
4. If URL wrong, edit and update
5. Delete and recreate if needed

### Voice Input Not Working in App

**Fix:**
1. Settings → Strategic Advisor → Microphone
2. Toggle ON
3. Reload app
4. Try again

### No Voice Announcements

**Fix:**
1. In app: Settings → Alerts
2. Voice Alerts → Toggle ON
3. Test Voice Alert → Should speak
4. If no sound, check phone volume

---

## 🎓 Pro Tips

### 1. Create Shortcuts for Common Tasks

Examples:
- "Check emails" → Opens filtered email view
- "Today's meetings" → Shows calendar
- "Team status" → Shows team updates

### 2. Use Siri from Apple Watch

All your Siri shortcuts work on Apple Watch:
```
🎤 "What's critical"
⌚ Opens on phone automatically
```

### 3. Combine with Other Apps

Create shortcuts that:
- Check Strategic Advisor
- Then open Calendar
- Then send message to assistant

### 4. Location-Based Triggers

**Shortcuts can trigger automatically:**
- When you arrive at office
- When you leave for day
- At specific times

Example:
```
Automation: "When I arrive at office"
→ Run "Morning Briefing" shortcut
→ Voice speaks summary automatically
```

### 5. Custom Wake Words

While "Hey Siri" is required, you can:
- Create shortcut with any name
- "Hey Siri, [your custom phrase]"

Examples:
- "Hey Siri, advisor"
- "Hey Siri, intelligence"
- "Hey Siri, CEO brief"

---

## 📋 Complete Command List

### Siri Commands (Outside App):

```
"Hey Siri, open Strategic Advisor"
"Hey Siri, Strategic Advisor"
"Hey Siri, what's critical"
"Hey Siri, show my dashboard"
"Hey Siri, morning briefing"
"Hey Siri, check urgent items"
```

### Voice Commands (Inside App):

```
"What's urgent?"
"What should I prioritize?"
"Summarize [topic]"
"What did [person] say?"
"Tell me about [subject]"
"What are my meetings?"
"Stop speaking"
"Thanks"
```

---

## 🎉 You're All Set!

Your Strategic Advisor now works seamlessly with Siri:

✅ **"Hey Siri, Strategic Advisor"** → Opens app  
✅ **Custom shortcuts** → Quick access to specific views  
✅ **Voice commands** → Ask questions hands-free  
✅ **Background alerts** → Critical notifications even on DND  
✅ **Always accessible** → From iPhone, iPad, Apple Watch  

---

## 🚀 Next Level: Automation

**Create morning routine:**

1. **Shortcuts** → **Automation**
2. **Create Personal Automation**
3. **Time of Day** → 7:00 AM
4. **Add Action** → Run shortcut "Morning Briefing"
5. **Toggle OFF** "Ask Before Running"
6. ✅ Every morning at 7 AM, briefing speaks automatically!

**Create evening routine:**

1. **Automation** → **Time of Day** → 5:00 PM
2. Run shortcut that asks: "What needs attention before EOD?"
3. ✅ Automatic end-of-day check!

---

**Your CEO Intelligence System is now voice-activated and hands-free!** 🎤🚀

Use Siri to access your strategic advisor anytime, anywhere, while driving, in meetings, or on the go!
