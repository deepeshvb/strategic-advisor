# 📊 Company-Wide Channel Configuration Guide

## Overview

This guide walks you through configuring **company-wide monitoring** for each channel across your organizations. This monitors ALL employees' communications (not just the CEO), providing complete organizational visibility.

---

## ⚠️ Before You Start

### **Legal & Compliance Requirements:**

1. **Employee Notification:** Inform all employees about monitoring
2. **Company Policy:** Ensure compliance with company policies
3. **Privacy Laws:** Comply with GDPR, CCPA, and local privacy laws
4. **Consent:** Obtain necessary consents where required
5. **Data Handling:** Follow data protection regulations

### **Required Access:**
- Admin or Global Admin credentials for each platform
- Authorization from company leadership
- IT department coordination (if applicable)

---

## 🏢 Company Selection

### **Step 1: Navigate to Companies Tab**

1. Open configuration dashboard: http://localhost:5173
2. Click the **"Companies"** tab at the top
3. You'll see all your companies:
   - Othain Group
   - OthainSoft
   - Jersey Technology Partners
   - Strivio LLC

### **Step 2: Choose a Company**

Select one company to start with. We'll use **Jersey Technology Partners** as an example.

---

## 📧 CHANNEL 1: Corporate Email (Company-Wide)

### **What This Monitors:**
- ALL employee mailboxes
- All sent/received emails
- Internal and external communications
- Distribution lists and shared mailboxes

### **Configuration Steps:**

#### **For Microsoft Exchange / Outlook:**

**Step 1: Get Admin Credentials**

1. **Log in to Microsoft 365 Admin Center:**
   - https://admin.microsoft.com
   - Use Global Admin account

2. **Create Service Account (Recommended):**
   - Navigate to **Users → Active Users**
   - Click **Add a user**
   - Username: `strategic-monitor@jerseytechpartners.com`
   - Assign license: **Exchange Online Plan 1** (minimum)
   - Click **Next** and create

3. **Grant Admin Permissions:**
   - Go to **Roles → Role assignments**
   - Click **Add role assignment**
   - Select **Exchange Administrator**
   - Add the service account
   - Click **Save**

4. **Enable Organization-Wide Access:**
   
   **Option A: Application Impersonation (Recommended - Monitors ALL mailboxes automatically):**
   
   ```powershell
   # Connect to Exchange Online
   Connect-ExchangeOnline
   
   # Grant ApplicationImpersonation role (access to ALL mailboxes in organization)
   New-ManagementRoleAssignment -Name "Strategic Monitor Impersonation" -Role ApplicationImpersonation -User strategic-monitor@jerseytechpartners.com
   ```
   
   This grants access to **ALL current and future mailboxes** automatically. No need to specify individual emails!

   **Option B: Use Microsoft Graph API (Alternative):**
   
   Instead of Exchange, use Graph API with `Mail.Read` application permission. This automatically discovers and monitors all mailboxes in the organization.

5. **Enable App Password:**
   - Go to **My Account:** https://myaccount.microsoft.com
   - Click **Security**
   - Click **App passwords**
   - Generate new app password
   - **Copy and save it** (you'll need this)

**Step 2: Configure in Dashboard**

1. In the configuration dashboard, find **Jersey Technology Partners**
2. Find **Corporate Email** channel
3. Click the checkbox to **enable** it
4. Click **"Configure"** button
5. Fill in the form:

   ```
   Email Provider: Microsoft Outlook / Exchange
   
   Company Domain: jerseytechpartners.com
   
   Admin Email Account: strategic-monitor@jerseytechpartners.com
   
   Admin App Password: [paste the app password you generated]
   
   Exchange Server: outlook.office365.com
   
   Monitoring Scope: ● Entire Organization (automatic)
                    ○ Specific mailboxes only
   ```

6. Click **"Save Configuration"**
7. Status should change to **"Configured"** ✅

**That's it!** The system will automatically discover and monitor ALL mailboxes in the @jerseytechpartners.com domain. No need to list individual emails!

---

#### **For Google Workspace:**

**Step 1: Create Service Account**

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com

2. **Create New Project:**
   - Click project dropdown → **New Project**
   - Name: "Strategic Advisor Monitor"
   - Click **Create**

3. **Enable Gmail API:**
   - Navigate to **APIs & Services → Library**
   - Search for "Gmail API"
   - Click **Enable**

4. **Create Service Account:**
   - Go to **IAM & Admin → Service Accounts**
   - Click **Create Service Account**
   - Name: `strategic-monitor`
   - Click **Create and Continue**
   - Skip role assignment
   - Click **Done**

5. **Generate Keys:**
   - Click on the service account you created
   - Go to **Keys** tab
   - Click **Add Key → Create New Key**
   - Choose **JSON**
   - Download and **save the JSON file securely**

6. **Enable Domain-Wide Delegation:**
   - In service account details, click **Show Domain-Wide Delegation**
   - Enable **Enable Google Workspace Domain-Wide Delegation**
   - Note the **Client ID**

7. **Grant Admin API Access:**
   - Go to **Google Workspace Admin Console:** https://admin.google.com
   - Navigate to **Security → API Controls**
   - Click **Manage Domain-Wide Delegation**
   - Click **Add New**
   - Paste the Client ID
   - Add these OAuth scopes:
     ```
     https://www.googleapis.com/auth/gmail.readonly
     https://www.googleapis.com/auth/admin.directory.user.readonly
     ```
   - Click **Authorize**

**Step 2: Configure in Dashboard**

1. Enable **Corporate Email** for your company
2. Click **"Configure"**
3. Fill in:
   ```
   Email Provider: Google Workspace
   
   Company Domain: yourcompany.com
   
   Service Account JSON: [upload the JSON file you downloaded]
   
   Monitoring Scope: ● Entire Organization (automatic)
                    ○ Specific mailboxes only
   ```

4. Click **"Save Configuration"**

**That's it!** The system will automatically discover and monitor ALL users in your Google Workspace domain using the Admin SDK.

---

## 💬 CHANNEL 2: Microsoft Teams (Company-Wide)

### **What This Monitors:**
- ALL team channels (public and private)
- Direct messages between employees
- Group chats
- Files shared in chats
- Meeting chats

### **Configuration Steps:**

**Step 1: Register App in Azure**

1. **Go to Azure Portal:**
   - https://portal.azure.com

2. **Navigate to Azure Active Directory:**
   - Click **Azure Active Directory** from left menu
   - Click **App registrations**

3. **Register New Application:**
   - Click **New registration**
   - Name: `Strategic Advisor Monitor`
   - Supported account types: **Accounts in this organizational directory only**
   - Redirect URI: Leave blank for now
   - Click **Register**

4. **Note the Application (client) ID and Tenant ID:**
   - On the Overview page, copy both IDs
   - Save them securely

5. **Create Client Secret:**
   - Click **Certificates & secrets**
   - Click **New client secret**
   - Description: "Strategic Monitor Secret"
   - Expires: 24 months
   - Click **Add**
   - **Copy the Value immediately** (you won't see it again)

6. **Grant API Permissions:**
   - Click **API permissions**
   - Click **Add a permission**
   - Select **Microsoft Graph**
   - Select **Application permissions** (not Delegated)
   - Add these permissions:
     ```
     - Channel.ReadBasic.All
     - ChannelMessage.Read.All
     - Chat.Read.All
     - ChatMessage.Read.All
     - Team.ReadBasic.All
     - TeamMember.Read.All
     - User.Read.All
     ```
   - Click **Add permissions**
   - Click **Grant admin consent for [Your Organization]**
   - Click **Yes** to confirm

**Step 2: Configure in Dashboard**

1. Enable **Microsoft Teams** for your company
2. Click **"Configure"**
3. Fill in:
   ```
   Azure App ID: [Your Application (client) ID]
   
   Client Secret: [The secret value you copied]
   
   Tenant ID: [Your Directory (tenant) ID]
   
   Monitoring Scope: ● All Teams & Channels (automatic organization-wide)
                    ○ Specific teams only
   
   ☑ Monitor Private Messages: Yes
   ☑ Monitor Group Chats: Yes
   ```

4. Click **"Save Configuration"**

**That's it!** With the permissions granted, the system will automatically discover and monitor ALL teams, channels, and chats in your organization. No need to list individual team names!

---

## 💬 CHANNEL 3: Slack (Company-Wide)

### **What This Monitors:**
- ALL public channels
- Private channels (if bot is invited)
- Direct messages (if enabled)
- File uploads and shares

### **Configuration Steps:**

**Step 1: Create Slack App**

1. **Go to Slack API:**
   - https://api.slack.com/apps

2. **Create New App:**
   - Click **Create New App**
   - Choose **From scratch**
   - App Name: `Strategic Advisor Monitor`
   - Pick your workspace
   - Click **Create App**

3. **Add Bot Token Scopes:**
   - Click **OAuth & Permissions** from left menu
   - Scroll to **Scopes** section
   - Under **Bot Token Scopes**, add:
     ```
     - channels:history
     - channels:read
     - groups:history
     - groups:read
     - im:history
     - im:read
     - mpim:history
     - mpim:read
     - users:read
     - team:read
     - files:read
     ```

4. **Install App to Workspace:**
   - Scroll up to **OAuth Tokens**
   - Click **Install to Workspace**
   - Review permissions
   - Click **Allow**
   - **Copy the Bot User OAuth Token** (starts with `xoxb-`)

5. **Invite Bot to Channels:**
   - In Slack, go to each channel you want to monitor
   - Type: `/invite @Strategic Advisor Monitor`
   - For private channels, the bot must be invited manually

**Step 2: Configure in Dashboard**

1. Enable **Slack** for your company
2. Click **"Configure"**
3. Fill in:
   ```
   Slack Bot Token: xoxb-your-token-here
   
   Workspace ID: T0123456789 (find in Slack settings)
   
   Monitoring Scope: ● All Workspace Channels (automatic discovery)
                    ○ Specific channels only
   
   ☑ Monitor Direct Messages: Yes
   ☑ Monitor Private Channels: Yes (bot must be invited)
   ```

4. Click **"Save Configuration"**

**That's it!** The system will automatically discover all public channels. For private channels, simply invite the bot once: `/invite @Strategic Advisor Monitor` and it will monitor automatically.

---

## 📅 CHANNEL 4: Calendar (Company-Wide)

### **What This Monitors:**
- ALL employee calendars
- Meeting attendees and details
- Recurring meetings
- Calendar conflicts
- Time allocation analysis

### **Configuration Steps:**

#### **For Microsoft 365 Calendar:**

**Step 1: Use Same Azure App from Teams**

You can reuse the Azure AD app you created for Teams, or create a new one.

**Add Calendar Permissions:**
1. Go to your Azure AD app registration
2. Click **API permissions**
3. Click **Add a permission**
4. Select **Microsoft Graph**
5. Select **Application permissions**
6. Add:
   ```
   - Calendars.Read
   - Calendars.ReadWrite (if you want conflict resolution)
   - User.Read.All
   ```
7. Click **Grant admin consent**

**Step 2: Configure in Dashboard**

1. Enable **Calendar** for your company
2. Click **"Configure"**
3. Fill in:
   ```
   Calendar Provider: Microsoft Outlook Calendar / Exchange
   
   Company Domain: jerseytechpartners.com
   
   Azure App ID: [Same from Teams setup]
   
   Client Secret: [Same from Teams setup]
   
   Tenant ID: [Same from Teams setup]
   
   Monitoring Scope: ● All Organization Calendars (automatic discovery)
                    ○ Specific users only
   ```

4. Click **"Save Configuration"**

**That's it!** The system will automatically discover and monitor ALL calendars in your organization using the Microsoft Graph API. No need to list individual users!

---

#### **For Google Workspace Calendar:**

**Step 1: Use Service Account from Gmail**

Reuse the service account you created for Gmail.

**Add Calendar API:**
1. Go to Google Cloud Console
2. Navigate to **APIs & Services → Library**
3. Search for "Google Calendar API"
4. Click **Enable**

**Update API Scopes:**
1. Go to **Google Workspace Admin Console**
2. Navigate to **Security → API Controls → Manage Domain-Wide Delegation**
3. Find your Client ID
4. Add this scope:
   ```
   https://www.googleapis.com/auth/calendar.readonly
   ```

**Step 2: Configure in Dashboard**

1. Enable **Calendar** for your company
2. Click **"Configure"**
3. Fill in:
   ```
   Calendar Provider: Google Workspace Calendar
   
   Company Domain: yourcompany.com
   
   Service Account JSON: [Use same JSON from Gmail setup]
   
   Monitoring Scope: ● All Organization Calendars (automatic discovery)
                    ○ Specific users only
   ```

**That's it!** The system will use the Admin SDK to automatically discover and monitor ALL user calendars in your Google Workspace domain.

---

## 📁 CHANNEL 5: Documents (Company-Wide)

### **What This Monitors:**
- ALL SharePoint document libraries
- OneDrive for Business files
- Google Drive files
- File versions and changes
- Sharing permissions

### **Configuration Steps:**

#### **For SharePoint / OneDrive:**

**Step 1: Use Azure App from Teams**

**Add SharePoint Permissions:**
1. Go to your Azure AD app
2. Add these permissions:
   ```
   - Sites.Read.All
   - Files.Read.All
   ```
3. Grant admin consent

**Step 2: Configure in Dashboard**

1. Enable **Documents** for your company
2. Click **"Configure"**
3. Fill in:
   ```
   Document Provider: Microsoft SharePoint
   
   Company SharePoint URL: https://yourcompany.sharepoint.com
   
   Azure App ID: [Same from Teams setup]
   
   Client Secret: [Same from Teams setup]
   
   Tenant ID: [Same from Teams setup]
   
   Monitoring Scope: ● All Sites & Libraries (automatic discovery)
                    ○ Specific sites/folders only
   
   File Types to Monitor: .docx, .xlsx, .pdf, .pptx
                         (Leave empty to monitor all file types)
   ```

4. Click **"Save Configuration"**

**That's it!** The system will automatically discover all SharePoint sites, OneDrive accounts, and document libraries in your organization. No need to specify individual folders!

---

#### **For Google Drive:**

**Step 1: Enable Drive API**

1. Go to Google Cloud Console
2. Enable **Google Drive API**
3. Add this scope to domain-wide delegation:
   ```
   https://www.googleapis.com/auth/drive.readonly
   ```

**Step 2: Configure in Dashboard**

1. Enable **Documents**
2. Click **"Configure"**
3. Fill in:
   ```
   Document Provider: Google Workspace Drive
   
   Company Domain: yourcompany.com
   
   Service Account JSON: [Same JSON file]
   
   Monitoring Scope: ● All Shared Drives (automatic discovery)
                    ○ Specific drives/folders only
   
   File Types: .doc, .docx, .pdf, .xlsx
              (Leave empty for all types)
   ```

**That's it!** The system will automatically discover all Shared Drives and monitor changes organization-wide.

---

## ✅ Verification Checklist

After configuring each channel, verify:

### **For Each Company:**

- [ ] **Active Monitoring** toggle is ON
- [ ] **Email Channel:**
  - [ ] Checkbox enabled
  - [ ] Status shows "Configured" ✅
  - [ ] Admin account has delegated access to all mailboxes
- [ ] **Teams Channel:**
  - [ ] Checkbox enabled
  - [ ] Status shows "Configured" ✅
  - [ ] Azure app has admin consent
- [ ] **Slack Channel:**
  - [ ] Checkbox enabled
  - [ ] Status shows "Configured" ✅
  - [ ] Bot invited to all channels
- [ ] **Calendar Channel:**
  - [ ] Checkbox enabled
  - [ ] Status shows "Configured" ✅
  - [ ] API access granted
- [ ] **Documents Channel:**
  - [ ] Checkbox enabled
  - [ ] Status shows "Configured" ✅
  - [ ] Folder permissions granted

---

## 🎯 Quick Reference: Credentials Needed

### **Per Company Configuration:**

| Channel | What You Need |
|---------|---------------|
| **Email (Microsoft)** | Admin account email + App password + Exchange server |
| **Email (Google)** | Service account JSON + Domain-wide delegation |
| **Teams** | Azure App ID + Client Secret + Tenant ID |
| **Slack** | Bot OAuth Token + Workspace ID |
| **Calendar (Microsoft)** | Same as Teams OR dedicated credentials |
| **Calendar (Google)** | Same service account as Email |
| **Documents (SharePoint)** | Same as Teams + Site URL |
| **Documents (Google Drive)** | Same service account as Email |

---

## 🔄 Repeat for Each Company

Once you've configured all channels for **Jersey Technology Partners**, repeat the process for:

1. **Othain Group**
   - Register separate Azure app / Slack bot / Service account
   - Configure all 5 channels
   - Set domain to: `othaingroup.com`

2. **OthainSoft**
   - Separate credentials for `othainsoft.com`
   - Configure channels

3. **Strivio LLC**
   - Separate credentials for `strivio.com`
   - Configure channels

---

## 💡 Tips & Best Practices

### **Security:**
- Use dedicated service accounts (don't use your personal admin account)
- Store credentials in password manager
- Enable MFA on admin accounts
- Rotate secrets every 6 months

### **Performance:**
- Start with one company, test thoroughly
- Add companies incrementally
- Monitor system performance

### **Compliance:**
- Document all access granted
- Create audit trail of configuration changes
- Review privacy policies regularly
- Ensure employee notification

### **Testing:**
- After configuration, send test messages
- Verify the AI can access and analyze them
- Check SMS alerts work correctly

---

## 🆘 Troubleshooting

### **"Failed to Configure" Error:**
- Verify all credentials are correct
- Check API permissions are granted
- Ensure admin consent is given
- Check service account has required licenses

### **"Access Denied" Error:**
- Verify delegated permissions
- Check service account role assignments
- Ensure app has organization-wide access

### **Not Monitoring All Users:**
- Double-check mailbox delegation (Email)
- Verify bot is invited to channels (Slack/Teams)
- Ensure service account has domain-wide delegation (Google)

---

## 📞 Support Resources

### **Microsoft 365:**
- Admin Center: https://admin.microsoft.com
- Exchange Admin: https://admin.exchange.microsoft.com
- Azure Portal: https://portal.azure.com
- Microsoft Graph Permissions: https://docs.microsoft.com/graph/permissions-reference

### **Google Workspace:**
- Admin Console: https://admin.google.com
- Cloud Console: https://console.cloud.google.com
- API Documentation: https://developers.google.com/workspace

### **Slack:**
- API Documentation: https://api.slack.com
- App Management: https://api.slack.com/apps

---

## ✨ After Configuration

Once all channels are configured across all companies, the Strategic AI Advisor will:

1. **Monitor 24/7:** Check all channels every 15 minutes
2. **Analyze Company-Wide:** Scan ALL emails, Teams messages, Slack channels, calendars, and documents
3. **Identify Patterns:** Find cross-team conflicts, resource bottlenecks, strategic opportunities
4. **Alert You:** Send SMS/WhatsApp/Email alerts for urgent CEO-level items
5. **Provide Insights:** Answer questions like:
   - "What conflicts exist between teams today?"
   - "What are my top priorities across all companies?"
   - "Which teams are overworked?"
   - "What strategic opportunities am I missing?"

---

**Ready to start? Begin with Channel 1 (Email) for one company, then work your way through!** 🚀
