# 🎯 Automatic Domain-Wide Monitoring Guide

## Overview

The Strategic Advisor system now uses **automatic domain-wide monitoring**. This means you configure **once per company** and the system automatically discovers and monitors ALL communication channels.

## ✅ What This Means for You

### Before (Old Approach ❌)
- Had to list every email address: `user1@company.com, user2@company.com, user3@company.com...`
- Had to specify every Teams channel: `Engineering Team, Sales Team, Marketing Team...`
- Had to specify every Slack channel: `general, engineering, leadership, sales...`
- Had to specify every calendar: `user1@company.com, user2@company.com...`
- **Maintenance nightmare** when employees joined/left or new channels were created

### Now (New Approach ✅)
- Configure **company domain** once: `jerseytechpartners.com`
- System **automatically discovers ALL**:
  - Email mailboxes in the domain
  - Teams channels and chats
  - Slack channels
  - User calendars
  - SharePoint sites and documents
- **Zero maintenance** - new employees, channels, and documents are automatically monitored

---

## 📧 How It Works By Channel

### 1. Corporate Email
**You provide:**
- Company domain: `jerseytechpartners.com`
- Admin service account with `ApplicationImpersonation` role
- App password/client secret

**System automatically monitors:**
- ALL current employee mailboxes
- ALL future employee mailboxes (when they're created)
- No need to list individual emails

**Technical:**
- Microsoft: Uses Exchange ApplicationImpersonation role
- Google: Uses Admin SDK with domain-wide delegation

---

### 2. Microsoft Teams
**You provide:**
- Azure App ID, Client Secret, Tenant ID
- Permissions: `Chat.Read.All`, `Channel.ReadBasic.All`, `ChannelMessage.Read.All`

**System automatically monitors:**
- ALL public teams and channels
- ALL private teams (if app has permission)
- ALL 1-on-1 chats
- ALL group chats
- No need to list individual team names

**Technical:**
- Uses Microsoft Graph API to enumerate teams automatically
- Monitors via webhook subscriptions for real-time updates

---

### 3. Slack
**You provide:**
- Slack Bot Token with workspace-wide scopes
- Workspace ID

**System automatically monitors:**
- ALL public channels
- ALL private channels (bot must be invited once with `/invite @BotName`)
- ALL direct messages
- No need to list channel names

**Technical:**
- Uses Slack API to discover channels via `conversations.list`
- Real-time monitoring via Slack Events API

---

### 4. Company Calendars
**You provide:**
- Company domain: `jerseytechpartners.com`
- Azure App ID/Service Account with calendar permissions

**System automatically monitors:**
- ALL user calendars in the domain
- ALL meeting room calendars
- No need to list individual users

**Technical:**
- Microsoft: Uses Graph API with `Calendars.Read` application permission
- Google: Uses Admin SDK Calendar API

---

### 5. Documents (SharePoint/OneDrive/Google Drive)
**You provide:**
- Company SharePoint URL: `https://jerseytechpartners.sharepoint.com`
- Azure App ID/Service Account with document permissions

**System automatically monitors:**
- ALL SharePoint sites
- ALL document libraries
- ALL OneDrive accounts
- ALL Shared Drives (Google)
- No need to specify folders

**Technical:**
- Microsoft: Uses Graph API with `Files.Read.All` application permission
- Google: Uses Drive API with Admin SDK

---

## 🔧 Configuration Steps (Simplified)

### For Each Company:

1. **Go to Companies Tab** in the config dashboard
2. **Add Your Company:**
   - Name: `Jersey Technology Partners`
   - Domain: `jerseytechpartners.com`
3. **Configure Each Channel:**
   - Email: Just enter admin account + domain
   - Teams: Just enter Azure App credentials
   - Slack: Just enter bot token
   - Calendar: Just enter admin credentials + domain
   - Documents: Just enter SharePoint URL + credentials
4. **Save** - That's it!

The system handles the rest automatically.

---

## 💡 Key Benefits

### 1. Zero Maintenance
- No need to update when employees join/leave
- No need to update when new channels/teams are created
- Automatic discovery of all resources

### 2. Complete Coverage
- Never miss monitoring a new team or channel
- Every mailbox is monitored from day one
- All documents are tracked automatically

### 3. Security
- Admin credentials are encrypted
- Service accounts have read-only access
- No need to grant individual user permissions

### 4. Scalability
- Works for 10 employees or 10,000 employees
- Same configuration effort regardless of company size
- Automatically scales as organization grows

---

## 🛡️ Security & Compliance

### What Access Is Required?
- **Read-only access** to all company data
- **Service account** with organization-wide permissions
- **Application permissions** (not delegated user permissions)

### Legal Considerations:
1. **Employee Monitoring Policy:** Ensure your company has proper employee monitoring policies in place
2. **Data Privacy:** All data processing happens locally on your server
3. **Compliance:** Check with legal team for GDPR/CCPA/industry-specific requirements
4. **Transparency:** Inform employees about monitoring in accordance with local laws

### Best Practices:
- Use dedicated service accounts (not personal accounts)
- Enable audit logging for all API access
- Regularly review access permissions
- Implement least-privilege access principles

---

## 📝 Example Configuration

### Jersey Technology Partners

**Company Domain:** `jerseytechpartners.com`

#### Email (Microsoft Exchange)
```
Email Provider: Microsoft Outlook / Exchange
Company Domain: jerseytechpartners.com
Admin Account: strategic-monitor@jerseytechpartners.com
App Password: [app-specific password]
Exchange Server: outlook.office365.com

✅ Monitoring: ALL @jerseytechpartners.com mailboxes automatically
```

#### Microsoft Teams
```
Azure App ID: abc123-def456-ghi789
Client Secret: [client secret]
Tenant ID: xyz789

✅ Monitoring: ALL teams, channels, and chats automatically
```

#### Calendar
```
Calendar Provider: Microsoft Outlook Calendar
Company Domain: jerseytechpartners.com
Azure App ID: [same as Teams]
Client Secret: [same as Teams]

✅ Monitoring: ALL user calendars automatically
```

---

## ❓ FAQ

### Q: What if I only want to monitor specific teams/channels?
**A:** The configuration UI includes optional filters. While the system discovers everything automatically, you can exclude specific channels or users if needed.

### Q: What about private messages/channels?
**A:** 
- Teams: Private chats are monitored if you grant `Chat.Read.All` permission
- Slack: Private channels require inviting the bot once with `/invite @BotName`

### Q: How long does automatic discovery take?
**A:** Initial discovery happens within 1-2 minutes. Ongoing monitoring is real-time via webhooks.

### Q: What if an employee leaves the company?
**A:** Their mailbox is automatically excluded once it's deactivated in your admin console. No manual configuration needed.

### Q: Can I monitor multiple companies?
**A:** Yes! Add as many companies as you want. Each company gets its own automatic domain-wide monitoring.

---

## 🚀 Next Steps

1. **Review the updated Configuration UI** - Notice the simplified forms
2. **Check CHANNEL-CONFIGURATION-GUIDE.md** - Updated with automatic monitoring steps
3. **Configure your first company** - Should take < 5 minutes
4. **Verify monitoring** - Check backend logs to confirm automatic discovery is working

---

## 📞 Support

If you have questions about setting up automatic monitoring, refer to:
- `CHANNEL-CONFIGURATION-GUIDE.md` - Detailed setup steps
- `MULTI-COMPANY-OVERVIEW.md` - Architecture overview
- `SYSTEM-STATUS.md` - Current system status

---

**Last Updated:** February 5, 2026
