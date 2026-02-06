# 🚀 Quick Start - Server Mode

## What You Have Now

Your Strategic Advisor is configured to run as a **24/7 monitoring server** on your home network.

---

## ⚡ 2-Minute Setup

### 1. Start the Server

**Windows:**
```powershell
.\START-SERVER-MODE.bat
```

**macOS:**
```bash
chmod +x start-server-macos.sh
./start-server-macos.sh
```

### 2. Configure Alert Method

Open browser → Go to **Settings → Alerts**

Choose at least one:
- ✅ **Desktop Notifications** (enabled by default)
- **Slack** - Enter webhook URL
- **Pushover** - Enter User Key + API Token (best for mobile!)
- **Email/SMS** - Requires backend setup

Click **"Send Test Alert"** to verify.

### 3. Configure Companies & Integrations

**Settings → Companies:**
- Your 4 companies are already configured
- Mark which ones are "Active"

**Settings → Integrations:**
- Enable channels you want to monitor
- Configure credentials (requires backend for live data)

---

## 🔔 Alert Options (Choose Your Favorite)

### Option 1: Pushover (Recommended - Best for Mobile)
**Why**: Works like Apple/Google push notifications, alerts you anywhere

1. Sign up: https://pushover.net ($5 one-time)
2. Install app on phone
3. Settings → Alerts → Pushover
4. Enter User Key + API Token
5. ✅ Get alerts on phone anywhere!

### Option 2: Slack
**Why**: If you already use Slack daily

1. Slack → Apps → Incoming Webhooks
2. Choose channel
3. Copy webhook URL
4. Settings → Alerts → Slack
5. Paste URL
6. ✅ Alerts post to Slack!

### Option 3: Microsoft Teams
**Why**: If you use Teams for work

1. Teams → Channel → Connectors
2. Add "Incoming Webhook"
3. Copy webhook URL
4. Settings → Alerts → Teams
5. Paste URL
6. ✅ Alerts post to Teams!

### Option 4: Email/SMS
**Why**: Traditional, but requires backend setup

See `SERVER-MODE-GUIDE.md` for backend configuration.

---

## 📱 Access from Other Devices

### Find Your Server IP:

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address"

**macOS:**
```bash
ifconfig | grep "inet "
```

### Access from Phone/Tablet/Laptop:

```
http://YOUR_SERVER_IP:5173
```

Example: `http://192.168.1.100:5173`

---

## 🤖 Auto-Start on Boot (Optional)

### Windows:
```powershell
.\install-autostart-windows.bat
```
Server starts automatically when Windows boots.

### macOS:
```bash
chmod +x install-autostart-macos.sh
./install-autostart-macos.sh
```
Server starts automatically at login + auto-restarts if crashes.

---

## 💬 How to Use

### Ask Questions:
1. Open browser → `http://localhost:5173`
2. Type or speak: "What's urgent?"
3. Get AI response with critical items

### Get Alerted:
1. Server monitors every 15 minutes
2. When critical item detected → Alert sent
3. You receive notification (Slack/Pushover/Email/etc.)
4. Tap alert → Opens to details

### From Anywhere on Network:
- Phone: Open browser → `http://SERVER_IP:5173`
- Tablet: Same
- Another laptop: Same

---

## 🧪 Test It

### 1. Test Alerts:
- Settings → Alerts
- Click "Send Test Alert"
- Verify you received it

### 2. Test Network Access:
- From phone/tablet on same WiFi
- Open: `http://YOUR_SERVER_IP:5173`
- Should see app

### 3. Test Monitoring:
- Let it run for 15 minutes
- Check console logs
- Should see "🔍 Checking for urgent items..."

---

## 📊 What It Monitors

Currently using **synthetic data** for testing. To monitor real data:

1. Configure integrations (Settings → Integrations)
2. Set up backend API (see `SERVER-MODE-GUIDE.md`)
3. Backend fetches from: Email, Teams, Slack, Calendar
4. Frontend analyzes for critical items
5. Alerts sent when detected

### Critical Item Examples:
- Email with "URGENT" in subject
- Teams message mentioning "@CEO"
- Meeting in <1 hour needing prep
- Multiple unread from VIP sender
- Pattern of escalating issues

---

## 🔐 Privacy

- **Local Processing**: AGI analysis happens in browser
- **Local LLM Option**: Use Ollama for sensitive data
- **Hybrid Mode**: Sensitive → Local, General → Cloud
- **Your Network Only**: Not exposed to internet
- **Backend Optional**: For live integrations only

---

## 🆘 Troubleshooting

### Can't access from phone:
1. Same WiFi? Both devices on same network?
2. Firewall? Allow port 5173
3. Correct IP? Double-check with `ipconfig`

### No alerts received:
1. Configured? Settings → Alerts → Enable at least one
2. Tested? Click "Send Test Alert"
3. Permissions? (Desktop notifications, Slack channel, etc.)

### Server stopped:
1. Check if window closed
2. For 24/7: Use auto-start scripts
3. Or: Run in background with `nohup` (macOS/Linux)

---

## 📖 More Info

- **Full Guide**: `SERVER-MODE-GUIDE.md`
- **Backend Setup**: `BACKEND-SETUP-GUIDE.md`
- **Integration Config**: `IMPLEMENTATION-GUIDE.md`

---

## 🎯 Typical CEO Workflow

### Morning:
1. Server running at home (always on)
2. 7 AM: Check for overnight critical items
3. If any: Pushover alert to your phone
4. Tap alert → Review → Take action

### During Day:
1. Critical email arrives
2. Server detects within 15 min
3. Sends alert to Slack + Pushover
4. You see it immediately
5. Query for more context from any device

### Evening:
1. 5 PM: End of day summary alert
2. Review outstanding items
3. Server continues monitoring overnight

---

**🎉 Your Strategic Advisor is ready to monitor 24/7!**

Start the server, configure one alert channel, and let it run. You'll be notified when critical items need your attention.
