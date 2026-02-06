# 🚀 Strategic Advisor - Production Ready!

## ⚡ Quick Start (Run This Now)

### If Build Fails, Use This:
```powershell
.\FIX-AND-START.bat
```

This script:
- Cleans up problematic build files
- Reinstalls esbuild
- Starts the server
- Shows network access URLs

### Normal Start:
```powershell
.\START-SERVER-MODE.bat
```

---

## 🎯 What You Have

### ✅ Mobile Authentication
- Phone number-based login
- Role-based access control (Admin/User/Read-Only)
- Session management
- User management UI

### ✅ 24/7 Server Monitoring
- Runs continuously on laptop/Mac mini
- Checks every 15 minutes
- Sends alerts when critical items detected
- Network-wide access

### ✅ Multi-Channel Alerts
- Desktop notifications
- Pushover (mobile push - recommended!)
- Slack webhooks
- Microsoft Teams webhooks
- Email/SMS (requires backend)

### ✅ Mobile-Optimized
- Responsive UI for phone/tablet
- PWA installable
- Touch-friendly buttons
- Bottom navigation on mobile
- Voice control

---

## 📱 Access from Mobile

### Find Your Server IP:
```powershell
ipconfig
```
Look for "IPv4 Address" (e.g., 10.1.10.93)

### Open on Phone:
```
http://YOUR_IP:5173
```

### First Time:
1. Setup wizard appears
2. Enter your mobile number as admin
3. Enter your name
4. ✅ Logged in as admin!

### Add Team Members:
1. Settings → User Management
2. Click "Add User"
3. Enter their phone number
4. Choose role (admin/user/readonly)
5. They can now login!

---

## 🔔 Configure Alerts (Recommended: Pushover)

### Pushover Setup (Best for Mobile):
1. Go to https://pushover.net
2. Sign up ($5 one-time)
3. Install app on phone
4. Get your User Key
5. Create app → Get API Token
6. In Strategic Advisor:
   - Settings → Alerts → Pushover
   - Enter User Key + API Token
   - Click "Send Test Alert"
7. ✅ Alerts on phone anywhere!

---

## 🏢 Configure Your Companies

Settings → Companies:

Your 4 companies are pre-loaded:
- Othain Group
- OthainSoft
- Jersey Technology Partners
- Strivio LLC

Mark which ones to monitor actively.

---

## 🔌 Set Up Integrations

Settings → Integrations:

Configure channels to monitor:
- Corporate Email (Microsoft 365/Gmail)
- Microsoft Teams
- Slack
- Calendar

**Note**: Live data requires backend API (see `BACKEND-SETUP-GUIDE.md`)

---

## 🤖 Set LLM Strategy

Settings → LLM Strategy:

Choose:
- **Local Only**: All processing on your machine (Ollama)
- **Cloud API Only**: Fast responses (Anthropic Claude)
- **Hybrid**: Sensitive → Local, General → Cloud

**Recommended**: Hybrid for best balance

---

## 🔄 Enable Auto-Start

### Windows:
```powershell
.\install-autostart-windows.bat
```

### macOS:
```bash
chmod +x install-autostart-macos.sh
./install-autostart-macos.sh
```

Server will start automatically when your computer boots.

---

## 🧪 Test Everything

### 1. Test Server Access
- Computer: `http://localhost:5173` ✅
- Mobile: `http://YOUR_IP:5173` ✅

### 2. Test Authentication
- Login with your number ✅
- Add another user ✅
- Login as that user ✅
- Check different permissions ✅

### 3. Test Alerts
- Configure Pushover/Slack ✅
- Send test alert ✅
- Receive on phone ✅

### 4. Test Monitoring
- Let run for 15 minutes ✅
- Check console logs ✅
- Verify background checks ✅

---

## 📖 Full Documentation

- **`PRODUCTION-DEPLOYMENT.md`** - Complete deployment guide
- **`PRODUCTION-AUTH-COMPLETE.md`** - Authentication details
- **`SERVER-MODE-GUIDE.md`** - 24/7 server setup
- **`QUICK-START-SERVER-MODE.md`** - Quick reference
- **`BACKEND-SETUP-GUIDE.md`** - Backend API guide

---

## 🚨 If Something Goes Wrong

### Build fails:
```powershell
.\FIX-AND-START.bat
```

### Can't access from mobile:
1. Same WiFi network?
2. Firewall blocking port 5173?
3. Using correct IP address?

### Login not working:
1. Setup completed?
2. Phone number format correct?
3. Check User Management for authorized numbers

### No alerts:
1. At least one channel configured?
2. Test alert sent successfully?
3. For Pushover: Check app installed on phone

---

## 🎉 You're Production Ready!

Everything is now configured for:
- ✅ 24/7 home server monitoring
- ✅ Mobile access with authentication
- ✅ User management
- ✅ Multi-channel alerts
- ✅ Network-wide access
- ✅ Role-based permissions

**Start now:**
```powershell
.\FIX-AND-START.bat
```

Then configure your alert method and add team members!

---

## 💡 Pro Tips

1. **Use Pushover** for mobile alerts - works anywhere
2. **Enable auto-start** so server runs 24/7
3. **Use Hybrid LLM** for best privacy/performance balance
4. **Add team members** with appropriate roles
5. **Install as PWA** on phone for native app experience
6. **Check logs regularly** to ensure monitoring is working

---

**Need help?** Check the documentation files above or review console logs for any errors.

🚀 Your Strategic Intelligence System is operational!
