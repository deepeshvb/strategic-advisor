# 🎛️ Configuration UI - User Guide

## Overview

Your Strategic AI Advisor now has a **Configuration Dashboard** - a web interface to manage all settings, users, and channels.

---

## 🌐 Access the Dashboard

**Local Access:**
```
http://localhost:5173
```

**Mobile Access (same WiFi):**
```
http://10.1.10.93:5173
```

---

## 📋 What You Can Configure

### 1. **General Settings** ⚙️

**Contact Information:**
- Your phone number for SMS alerts
- WhatsApp number
- Email address

**Monitoring Settings:**
- Check interval (how often to scan channels)
- Alert only for urgent items toggle
- Quiet hours (no alerts during sleep)
  - Start time
  - End time

**Daily Briefings:**
- Morning briefing time (email)
- Evening summary time (email)

---

### 2. **Authorized Users** 👥

**Manage who can interact with the AI advisor:**

- View list of authorized phone numbers
- Add new users
  - Name
  - Phone number
  - Role (Admin, User, etc.)
  - Alert level (all, critical only, none)
- Remove users
- Enable/disable users

**Current Users:**
- **CEO - Deepesh Vellore**: +17324214636 (Admin, all alerts)

---

### 3. **Monitoring Channels** 📊

**Configure which channels to monitor:**

Available channels:
- ✅ Corporate Email (Exchange/Outlook)
- ✅ Microsoft Teams
- ✅ Slack
- ✅ Calendar (meetings & conflicts)
- ✅ Documents (SharePoint, OneDrive)

For each channel:
- Enable/disable monitoring
- Configure API credentials
- Set sync frequency
- Choose what to monitor

**Status indicators:**
- 🟢 Configured & Active
- 🟡 Not Configured
- 🔴 Error/Disconnected

---

### 4. **LLM Strategy** 🧠

**Choose how the AI processes your data:**

**Options:**
1. **Cloud API Only** (Current)
   - Uses Anthropic Claude Sonnet 4
   - Best performance
   - Requires internet
   - Data sent to Anthropic (encrypted)

2. **Local LLM Only**
   - Uses Ollama (llama3.1:70b)
   - Complete privacy
   - No data leaves your computer
   - Requires powerful hardware
   - Slower processing

3. **Hybrid** (Recommended for sensitive data)
   - Local LLM for sensitive queries
   - Cloud for complex analysis
   - Best of both worlds

---

## 🚀 How to Use

### Starting the Configuration UI

**Method 1: Batch Script**
```
.\START-CONFIG-UI.bat
```

**Method 2: Manual**
```powershell
npm run dev
```

### Making Changes

1. **Navigate to the relevant tab** (General, Users, Channels, or LLM)
2. **Edit the settings**
3. **Click "Save Changes"** button (top right)
4. **Restart the backend** for changes to take effect

---

## 🔧 Technical Details

### Architecture

```
┌─────────────────┐      API Calls       ┌──────────────────┐
│  Configuration  │ ──────────────────► │  Backend Server  │
│      UI         │   (Port 3000)       │   (Node.js)      │
│  (React/Vite)   │ ◄────────────────── │                  │
│  Port 5173      │      JSON           │  - Config API    │
└─────────────────┘                     │  - Twilio        │
                                        │  - Claude AI     │
                                        │  - Email         │
                                        └──────────────────┘
```

### Backend API Endpoints

**GET `/api/config`**
- Returns current configuration

**POST `/api/config`**
- Updates configuration
- Requires restart to apply

**GET `/api/authorized-numbers`**
- Lists authorized phone numbers

**POST `/api/authorized-numbers`**
- Adds new authorized number

**GET `/api/channels`**
- Lists available monitoring channels

**GET `/api/monitoring-history`**
- Returns monitoring cycle history

---

## 📱 Mobile Access

The configuration UI is **mobile-responsive** and can be accessed from your phone:

1. **Make sure you're on the same WiFi** as the laptop
2. **Open browser** on your phone
3. **Navigate to:** `http://10.1.10.93:5173`
4. **Manage settings** on the go

---

## 🔐 Security Notes

- The configuration UI currently has **no authentication**
- Only accessible on your local network by default
- **Do not expose to the internet** without adding authentication
- For remote access, use VPN or SSH tunnel

---

## ⚙️ Configuration Storage

**Current implementation:**
- Settings stored in `.env.backend`
- Requires backend restart to apply changes
- No database yet (coming soon)

**Future implementation:**
- SQLite database for dynamic config
- Hot-reload without restart
- Configuration history/rollback

---

## 🛠️ Troubleshooting

### UI won't load
```powershell
# Run the fix script
.\FIX-AND-START.bat
```

### Backend not responding
```powershell
# Check if backend is running
curl http://localhost:3000/health

# Restart backend
.\START-BACKEND.bat
```

### Changes not applying
1. Save changes in UI
2. Restart backend: `.\START-BACKEND.bat`
3. Refresh the UI

---

## 📊 Features by Tab

| Tab | Features | Status |
|-----|----------|--------|
| **General** | Contact info, monitoring settings, briefing times | ✅ Working |
| **Users** | View/add/remove authorized numbers | ✅ Working |
| **Channels** | Enable/configure monitoring channels | 🟡 UI Ready, config pending |
| **LLM Strategy** | Choose AI processing method | ✅ Working |

---

## 🎯 Typical Workflow

### Initial Setup:
1. Open configuration UI
2. Verify your contact information
3. Set monitoring interval (default: 15 min)
4. Configure quiet hours
5. Set briefing times
6. Choose LLM strategy
7. Save changes
8. Restart backend

### Adding a Team Member:
1. Go to "Authorized Users" tab
2. Click "Add Number"
3. Enter name and phone number
4. Choose role and alert level
5. Save
6. They can now interact with the AI via SMS

### Enabling Email Monitoring:
1. Go to "Channels" tab
2. Find "Corporate Email"
3. Click "Configure"
4. Enter Exchange credentials
5. Enable the channel
6. Save changes

---

## 💡 Tips

- **Start with SMS** - it works now while channels are configured
- **Use quiet hours** - avoid late-night non-urgent alerts
- **Test with "brief" command** - send SMS "brief" to test anytime
- **Check monitoring history** - see what the AI has been watching
- **Adjust alert thresholds** - reduce noise from non-critical items

---

## 🔄 What Happens Next

1. **Twilio SMS approval comes through** (1-3 days)
2. **System fully operational** - SMS responses work
3. **Configure additional channels** as needed
4. **Add team members** who need access
5. **Fine-tune settings** based on usage

---

**The backend is running 24/7, monitoring and waiting for Twilio approval!** 🚀
