# 🖥️ Server Mode Deployment Guide

## Overview

Strategic Advisor can run as a **24/7 monitoring server** on your home network (laptop/Mac mini). It continuously monitors all configured channels and sends you alerts when critical items are detected.

---

## 🎯 What is Server Mode?

### How It Works:
1. **Runs on one machine** (laptop/Mac mini) connected to your home network
2. **Monitors 24/7** - checks all configured channels every 15 minutes
3. **Sends alerts** - email, SMS, Slack, Teams, Pushover, or desktop notifications
4. **Accessible from anywhere** on your network - query from phone, tablet, other computers
5. **Runs in background** - continues monitoring even when browser is closed

### Perfect For:
- Home office setups
- Always-on laptop as server
- Mac mini as dedicated monitoring server
- Any computer that stays on 24/7

---

## 🚀 Quick Start

### Windows:
```powershell
.\START-SERVER-MODE.bat
```

### macOS/Linux:
```bash
chmod +x start-server-macos.sh
./start-server-macos.sh
```

---

## 📡 Network Access

Once running, access from any device on your network:

**From the server itself:**
```
http://localhost:5173
```

**From other devices (phone, tablet, laptop):**
```
http://YOUR_SERVER_IP:5173
```

**Find your server IP:**
- **Windows**: `ipconfig` (look for IPv4)
- **macOS**: `ifconfig en0 | grep inet`

---

## 🔔 Alert Configuration

### 1. Desktop Notifications (Default)
- Enabled by default
- Shows OS-level notifications on the server machine
- Great for when you're nearby

### 2. Email Alerts
Configure in Settings → Alerts:
- **Email address**: Your email
- **SMTP settings** (backend required):
  - Host: `smtp.gmail.com` (or your provider)
  - Port: `587`
  - Username: Your email
  - Password: App-specific password

### 3. SMS Alerts
Configure in Settings → Alerts:
- **Phone number**: Your mobile
- **Provider**: Twilio, Vonage, or AWS SNS
- **Credentials**: API keys (backend required)

### 4. Slack Notifications
Configure in Settings → Alerts:
- Create incoming webhook in Slack workspace
- Paste webhook URL in settings
- Alerts post to your Slack channel

### 5. Microsoft Teams
Configure in Settings → Alerts:
- Create incoming webhook in Teams channel
- Paste webhook URL in settings
- Alerts post to your Teams channel

### 6. Pushover (Recommended for Mobile)
Best option for mobile push notifications!
- Sign up at: https://pushover.net
- Install app on phone
- Get User Key and API Token
- Configure in Settings → Alerts
- Receive push notifications anywhere

---

## 🔄 Auto-Start on Boot

### Windows:
```powershell
.\install-autostart-windows.bat
```

This creates:
- Startup shortcut
- Runs hidden in background
- Starts automatically with Windows

**To disable:**
1. Press `Win+R`
2. Type: `shell:startup`
3. Delete "Strategic Advisor" shortcut

### macOS:
```bash
chmod +x install-autostart-macos.sh
./install-autostart-macos.sh
```

This creates:
- LaunchAgent configuration
- Auto-restart if crashes
- Runs at login

**To disable:**
```bash
launchctl unload ~/Library/LaunchAgents/com.strategicadvisor.monitor.plist
rm ~/Library/LaunchAgents/com.strategicadvisor.monitor.plist
```

**View logs:**
```bash
tail -f ~/Library/Logs/strategic-advisor.log
```

---

## 📊 What Gets Monitored

### Email (Corporate/Gmail)
- Unread emails
- Urgent keywords: "urgent", "asap", "critical", "emergency"
- VIP senders
- Flagged messages

### Microsoft Teams
- Channel messages
- @mentions of CEO
- Urgent threads
- Important announcements

### Slack
- Channel messages
- Direct messages
- @mentions
- Urgent flags

### Calendar
- Upcoming meetings (next 48 hours)
- Meetings requiring prep
- Last-minute changes
- Double bookings

---

## 🚨 Alert Triggers

### Critical Alerts (Sent Immediately):
- Email with "URGENT", "CRITICAL", or "EMERGENCY" in subject
- Teams message mentioning @CEO or @all
- Calendar meeting starting in <1 hour that needs prep
- System down/outage mentions
- Customer escalations

### High Priority Alerts:
- Important email from VIP sender
- Teams message in critical channel
- Meeting in next 2 hours
- Multiple unread items from same sender
- Pattern of related issues

### Medium Priority Alerts:
- Daily morning briefing (7 AM)
- End of day summary (5 PM)
- Weekly rollup
- Trend reports

---

## 🔐 Security & Privacy

### What Stays Local:
- All company configurations
- User preferences
- Alert settings
- LLM strategy (Local/Hybrid/Cloud)

### What Needs Backend API:
- Integration data fetching (email, Teams, etc.)
- Email/SMS sending
- Credential storage

### Recommended Setup:
1. **Run on trusted home network**
2. **Use firewall** - only allow access from local network
3. **Use Hybrid LLM mode** - sensitive data stays local
4. **Backend on secure server** - credentials never in frontend
5. **HTTPS for production** - use reverse proxy (Nginx)

---

## 🛠️ Backend Setup (Required for Integrations)

To fetch real data from email, Teams, Slack, etc., you need a backend API.

### Option 1: Node.js Backend
```bash
# Clone backend starter
git clone https://github.com/your-org/strategic-advisor-backend
cd strategic-advisor-backend
npm install

# Configure credentials
cp .env.example .env
# Edit .env with your API keys

# Start backend
npm start
```

### Option 2: Python Backend
```bash
pip install flask msal msgraph-sdk twilio
python backend.py
```

### Option 3: Use Zapier/Make/n8n
- Create workflows to fetch data
- Expose as REST API
- Point frontend to webhook URLs

### Required Endpoints:
```
GET  /api/integrations/email?companyId={id}
GET  /api/integrations/teams?companyId={id}
GET  /api/integrations/calendar?companyId={id}
GET  /api/integrations/slack?companyId={id}
POST /api/alerts/email
POST /api/alerts/sms
```

---

## 🧪 Testing

### 1. Test Server Access
From another device on your network:
```
http://YOUR_SERVER_IP:5173
```

### 2. Test Alerts
1. Go to Settings → Alerts
2. Configure at least one channel (e.g., Slack webhook)
3. Click "Send Test Alert"
4. Verify alert received

### 3. Test Monitoring
1. Ensure at least one company configured
2. Enable at least one integration
3. Wait 15 minutes for first check
4. Check console logs for activity

### 4. Test Auto-Restart
1. Kill the server process
2. If auto-start configured, it should restart
3. Check logs to verify restart

---

## 📈 Monitoring Status

### Check Server Health:
```
http://localhost:5173
```
- Dashboard shows monitoring status
- Last check time
- Number of active integrations
- Critical/High/Medium item counts

### View Logs:
**Windows:**
- Open terminal where server is running
- Logs appear in console

**macOS:**
```bash
tail -f ~/Library/Logs/strategic-advisor.log
```

### Alert History:
- Go to Settings → Alerts
- View "Alert History" tab
- See last 100 alerts sent

---

## 🔧 Troubleshooting

### Server won't start:
```bash
# Check if port 5173 is in use
netstat -an | findstr 5173    # Windows
lsof -i :5173                  # macOS

# Kill process using the port
taskkill /F /PID <PID>         # Windows
kill -9 <PID>                  # macOS
```

### Can't access from other devices:
1. **Check firewall** - allow port 5173
2. **Verify same network** - both devices on same WiFi
3. **Check IP address** - use correct server IP
4. **Test connectivity** - ping server from other device

### Alerts not sending:
1. **Check configuration** - Settings → Alerts
2. **Test individual channel** - Send test alert
3. **Check backend** - If using email/SMS, backend must be running
4. **View console** - Look for error messages
5. **Check alert history** - See if alerts attempted

### High CPU/Memory usage:
1. **Check interval** - Default 15 min is efficient
2. **Limit integrations** - Don't enable all if not needed
3. **Use Local LLM** - Reduces API calls
4. **Clear cache** - Close/reopen browser periodically

---

## 💡 Pro Tips

### For Laptops:
- Adjust power settings to prevent sleep
- Use "prevent sleep when plugged in"
- Close lid mode: keep running when closed

### For Mac Mini:
- Perfect dedicated server
- Enable "Start up automatically after power failure"
- Use Energy Saver to prevent sleep
- Connect to UPS for power protection

### For Maximum Reliability:
- Use wired Ethernet (not WiFi)
- Enable auto-restart on crash
- Monitor logs for errors
- Set up status page on different device
- Use Pushover for mobile alerts (works anywhere)

### For Privacy:
- Use Hybrid LLM mode
- Run Ollama locally
- Keep backend on same machine or secure VPS
- Use VPN for remote access
- Don't expose to internet without HTTPS

---

## 🚀 Production Deployment

### Option 1: Home Server (Current)
- Run on laptop/Mac mini at home
- Accessible on home network only
- Free, private, full control

### Option 2: Cloud VPS
- Deploy to DigitalOcean/Linode/AWS
- Always accessible
- Requires HTTPS setup
- $5-10/month

### Option 3: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

```bash
docker build -t strategic-advisor .
docker run -d -p 5173:5173 --restart always strategic-advisor
```

---

## 📞 Support

### Documentation:
- `IMPLEMENTATION-GUIDE.md` - Integration setup
- `BACKEND-SETUP-GUIDE.md` - Backend API guide
- `PRODUCTION-READY.md` - Advanced features

### Logs Location:
- **Windows Console**: Where you ran START-SERVER-MODE.bat
- **macOS**: `~/Library/Logs/strategic-advisor.log`

---

**🎉 Your Strategic Advisor is now running 24/7!**

Access from anywhere on your network and receive alerts when critical items need your attention.
