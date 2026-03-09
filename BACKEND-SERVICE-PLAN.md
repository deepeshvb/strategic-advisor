# Backend AGI Monitoring Service - Implementation Plan

**Date:** February 10, 2026  
**Architecture:** Backend-first with messaging integration

---

## 🎯 Overview

Transform the Strategic Advisor from a web app to a **24/7 backend monitoring service** that proactively monitors all channels and alerts you via WhatsApp, SMS, Email, and Voice calls.

---

## 📋 Core Requirements

### Monitoring
- ✅ Run 24/7 on laptop (always plugged in, connected to internet)
- ✅ Check channels every 15 minutes (configurable)
- ✅ Use Claude AI for intelligent analysis
- ✅ Detect truly urgent items only
- ✅ Proactive, not reactive

### Communication Channels
1. **WhatsApp** (Primary)
   - All conversations with the agent
   - Ask questions anytime
   - Receive urgent alerts
   
2. **SMS** (Critical Issues Only)
   - Truly urgent items that need immediate attention
   - Backup if WhatsApp fails
   
3. **Email** (Daily Summaries)
   - Morning briefing (8 AM)
   - End-of-day summary (6 PM)
   - Weekly strategic report (Monday 9 AM)
   
4. **Voice Calls** (Critical/On-Demand)
   - Only for critical emergencies
   - On-demand: "Call me with today's briefing"

---

## 🏗️ Technical Architecture

### Backend Service Stack
```
Node.js + TypeScript
├── Monitoring Engine
│   ├── Channel Scanners (Teams, Email, Calendar, etc.)
│   ├── AGI Analysis (Claude API)
│   ├── Urgency Classifier
│   └── Alert Dispatcher
├── Communication Services
│   ├── Twilio (WhatsApp, SMS, Voice)
│   ├── SendGrid/Gmail (Email)
│   └── Message Queue
├── Web Dashboard (Config Only)
│   ├── React frontend (existing)
│   ├── Settings management
│   └── History viewer
└── Data Layer
    ├── SQLite database
    └── Configuration store
```

### Services to Integrate

#### 1. Twilio (WhatsApp, SMS, Voice)
```bash
npm install twilio
```

**Required:**
- Twilio Account SID
- Twilio Auth Token
- Twilio Phone Number (for SMS/Voice)
- WhatsApp sandbox or approved Business Account

**Cost:**
- SMS: ~$0.0075/message
- WhatsApp: ~$0.005/message
- Voice: ~$0.013/minute
- Monthly: ~$1.15 base fee

#### 2. Email Service (SendGrid or Gmail)
```bash
npm install @sendgrid/mail
# or
npm install nodemailer
```

**Options:**
- **SendGrid:** 100 emails/day free
- **Gmail SMTP:** Free, requires app password

#### 3. Channel Integrations
- Microsoft Teams API (existing)
- Gmail API (existing)
- Outlook API (existing)
- Calendar APIs (existing)

---

## 📁 New File Structure

```
strategic-coworker-app/
├── backend/                          # NEW: Backend service
│   ├── server.ts                     # Main server entry
│   ├── monitoring/
│   │   ├── monitor-engine.ts         # Core monitoring loop
│   │   ├── channel-scanner.ts        # Scan all channels
│   │   ├── urgency-classifier.ts     # Detect critical items
│   │   └── alert-scheduler.ts        # Schedule checks
│   ├── communications/
│   │   ├── whatsapp-service.ts       # Twilio WhatsApp
│   │   ├── sms-service.ts            # Twilio SMS
│   │   ├── email-service.ts          # SendGrid/Gmail
│   │   ├── voice-service.ts          # Twilio Voice
│   │   └── message-queue.ts          # Queue management
│   ├── agi/
│   │   ├── claude-service.ts         # Claude API (no CORS!)
│   │   ├── strategic-prompt.ts       # AGI prompts
│   │   └── urgency-detector.ts       # AI urgency analysis
│   ├── database/
│   │   ├── db.ts                     # SQLite setup
│   │   └── models.ts                 # Data models
│   └── config/
│       └── config.ts                 # Configuration
├── src/                              # KEEP: Web dashboard
│   └── (existing React app for config only)
└── scripts/
    ├── start-backend.bat             # Start monitoring service
    └── install-service.bat           # Install as Windows service
```

---

## 🔧 Implementation Steps

### Phase 1: Backend Service Setup (1-2 hours)
1. ✅ Create backend folder structure
2. ✅ Set up TypeScript + Node.js server
3. ✅ Configure environment variables
4. ✅ Create monitoring engine skeleton
5. ✅ Set up SQLite database

### Phase 2: Twilio Integration (30 min)
1. ✅ Sign up for Twilio account
2. ✅ Get phone number
3. ✅ Set up WhatsApp sandbox
4. ✅ Implement WhatsApp service
5. ✅ Implement SMS service
6. ✅ Implement Voice service

### Phase 3: AGI Intelligence (1 hour)
1. ✅ Move Claude API to backend (no CORS!)
2. ✅ Implement urgency classifier
3. ✅ Create conversation handler
4. ✅ Test AI responses

### Phase 4: Monitoring Engine (1-2 hours)
1. ✅ Implement channel scanners
2. ✅ Create monitoring loop (15-min intervals)
3. ✅ Add urgency detection
4. ✅ Implement alert logic

### Phase 5: Email Integration (30 min)
1. ✅ Set up SendGrid or Gmail
2. ✅ Create email templates
3. ✅ Implement daily summary
4. ✅ Schedule email reports

### Phase 6: Testing & Deployment (1 hour)
1. ✅ End-to-end testing
2. ✅ Create startup scripts
3. ✅ Install as Windows service
4. ✅ Configure auto-start

---

## 🔐 Required API Keys & Configuration

### Twilio
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### Claude AI
```env
ANTHROPIC_API_KEY=sk-ant-api03-xxx
```

### Email (SendGrid or Gmail)
```env
SENDGRID_API_KEY=SG.xxx
# or
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

### Your Contact Info
```env
CEO_PHONE_NUMBER=+1234567890
CEO_WHATSAPP_NUMBER=+1234567890
CEO_EMAIL=deepesh@example.com
```

### Monitoring Configuration
```env
MONITORING_INTERVAL_MINUTES=15
ALERT_ONLY_URGENT=true
QUIET_HOURS_START=22:00
QUIET_HOURS_END=07:00
```

---

## 📱 User Experience

### Morning (8:00 AM)
```
📧 Email: "Good morning! Daily briefing..."
📱 WhatsApp: "☀️ Morning briefing ready. Reply 'brief' for details."
```

### During Day (Critical Issue Detected)
```
📱 SMS: "🚨 URGENT: Conflict detected in Team A..."
📱 WhatsApp: "Critical issue needs attention..."
📞 Voice Call: "You have 1 critical issue..."
```

### Any Time (You Ask)
```
You via WhatsApp: "What's critical today?"
Agent: "Here are the 3 critical items:
1. Client X escalation...
2. Budget approval deadline...
3. Team conflict..."
```

### Evening (6:00 PM)
```
📧 Email: "End-of-day summary..."
```

---

## 🚀 Deployment

### Windows Service (Auto-start on boot)
```batch
# Install service
node backend/scripts/install-service.js

# Service will:
- Start on Windows boot
- Restart on crash
- Run in background
- Log to files
```

### Manual Start (for testing)
```batch
# Start backend service
cd c:\Users\deepe\strategic-coworker-app
npm run start:backend

# Service runs at: http://localhost:3000
# Web dashboard: http://localhost:5173 (for config)
```

---

## 📊 Cost Estimate

### Monthly Costs
- Twilio base: $1.15
- ~100 WhatsApp messages: $0.50
- ~20 SMS (critical only): $0.15
- ~5 voice calls (critical): $0.50
- SendGrid: Free (100/day)
- **Total: ~$2.30/month**

### One-time
- Claude API: Pay-as-you-go (~$5-10/month for 24/7 monitoring)

---

## ✅ Success Criteria

1. ✅ Service runs 24/7 without intervention
2. ✅ Receives questions via WhatsApp and responds intelligently
3. ✅ Sends SMS only for truly critical issues
4. ✅ Daily email summaries arrive on time
5. ✅ Voice calls work for critical alerts
6. ✅ Monitoring interval is configurable
7. ✅ Web dashboard shows history and settings

---

## 🎯 Next Steps

1. **Get Twilio Account**
   - Sign up: https://www.twilio.com/try-twilio
   - Get phone number
   - Enable WhatsApp sandbox

2. **Start Implementation**
   - Build backend service structure
   - Integrate Twilio
   - Connect Claude API
   - Test end-to-end

3. **Deploy & Test**
   - Install as Windows service
   - Test all alert channels
   - Verify 24/7 operation

---

**Ready to start building?** Let me know and I'll begin implementing the backend service!
