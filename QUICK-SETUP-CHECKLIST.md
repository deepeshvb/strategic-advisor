# ⚡ Quick Setup Checklist

## 📋 Before You Start

- [ ] Legal approval for company-wide monitoring
- [ ] Employee notification completed
- [ ] Admin credentials ready for each platform

---

## 🏢 Per Company Setup

### **Company: ____________________**

#### **1. Corporate Email** ✉️

**Microsoft 365:**
- [ ] Create service account: `strategic-monitor@company.com`
- [ ] Assign Exchange Administrator role
- [ ] Grant mailbox access to all users (PowerShell script recommended)
- [ ] Generate app password
- [ ] Enter in dashboard: Email + Password + Server (`outlook.office365.com`)

**Google Workspace:**
- [ ] Create service account in Google Cloud
- [ ] Enable Gmail API
- [ ] Enable domain-wide delegation
- [ ] Download JSON key
- [ ] Upload JSON to dashboard

---

#### **2. Microsoft Teams** 💬

- [ ] Register app in Azure Portal (portal.azure.com)
- [ ] Copy Application ID and Tenant ID
- [ ] Create client secret (save immediately!)
- [ ] Add Graph API permissions:
  - `Channel.ReadBasic.All`
  - `ChannelMessage.Read.All`
  - `Chat.Read.All`
  - `ChatMessage.Read.All`
  - `Team.ReadBasic.All`
- [ ] Grant admin consent
- [ ] Enter App ID + Secret + Tenant ID in dashboard

---

#### **3. Slack** 💬

- [ ] Create Slack app (api.slack.com/apps)
- [ ] Add bot token scopes:
  - `channels:history`, `channels:read`
  - `groups:history`, `groups:read`
  - `im:history`, `im:read`
  - `users:read`, `files:read`
- [ ] Install app to workspace
- [ ] Copy Bot OAuth Token (starts with `xoxb-`)
- [ ] Invite bot to all channels: `/invite @BotName`
- [ ] Enter Bot Token + Workspace ID in dashboard

---

#### **4. Calendar** 📅

**Microsoft:**
- [ ] Reuse Azure app from Teams setup
- [ ] Add permission: `Calendars.Read`
- [ ] Grant admin consent
- [ ] Enter credentials in dashboard

**Google:**
- [ ] Reuse service account from Email
- [ ] Enable Calendar API
- [ ] Add calendar scope to domain-wide delegation
- [ ] Enter in dashboard

---

#### **5. Documents** 📁

**SharePoint:**
- [ ] Reuse Azure app from Teams
- [ ] Add permissions: `Sites.Read.All`, `Files.Read.All`
- [ ] Grant admin consent
- [ ] Enter Site URL + credentials in dashboard

**Google Drive:**
- [ ] Reuse service account from Email
- [ ] Enable Drive API
- [ ] Add drive scope to domain-wide delegation
- [ ] Enter in dashboard

---

## ✅ Verification

- [ ] All channels show "Configured" status ✅
- [ ] Active Monitoring toggle is ON
- [ ] Test with sample message/email
- [ ] Verify AI can read and analyze
- [ ] Check SMS alerts work

---

## 🔄 Repeat for Each Company

- [ ] Othain Group
- [ ] OthainSoft
- [ ] Jersey Technology Partners
- [ ] Strivio LLC

---

## 📝 Credentials Reference Sheet

| Company | Email Admin | Teams App ID | Slack Bot Token | Notes |
|---------|-------------|--------------|-----------------|-------|
| Jersey Tech | ____________ | ____________ | ______________ | _____ |
| Othain Group | ____________ | ____________ | ______________ | _____ |
| OthainSoft | ____________ | ____________ | ______________ | _____ |
| Strivio LLC | ____________ | ____________ | ______________ | _____ |

---

**Estimated Time Per Company:** 30-45 minutes

**See CHANNEL-CONFIGURATION-GUIDE.md for detailed step-by-step instructions.**
