# Real Integrations Setup Guide

This guide will help you connect all your real communication channels to the Strategic Coworker AI.

## 🚀 Quick Start Overview

Your app supports the following integrations:
- ✉️ **Gmail** - Email communication
- 📧 **Outlook** - Microsoft email
- 💬 **Microsoft Teams** - Team collaboration
- 💼 **Slack** - Workspace communication
- 📅 **Google Calendar** - Schedule management
- 🎮 **Discord** - Community & team chat
- 🎯 **Jira** - Project management
- 🐙 **GitHub** - Code & project tracking

---

## 📋 Prerequisites

1. **Accounts**: Active accounts on platforms you want to integrate
2. **Admin Access**: Some integrations require workspace admin permissions
3. **API Access**: Ability to create API keys/OAuth apps

---

## 🔐 Environment Variables Setup

Update your `.env` file with your API keys:

```env
# Anthropic AI (Already configured)
VITE_ANTHROPIC_API_KEY=your_existing_key

# Gmail API
VITE_GMAIL_CLIENT_ID=your_gmail_client_id
VITE_GMAIL_CLIENT_SECRET=your_gmail_client_secret
VITE_GMAIL_REDIRECT_URI=http://localhost:5173/auth/gmail/callback

# Microsoft Graph (Teams + Outlook + Calendar)
VITE_MICROSOFT_CLIENT_ID=your_microsoft_client_id
VITE_MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
VITE_MICROSOFT_TENANT_ID=your_tenant_id
VITE_MICROSOFT_REDIRECT_URI=http://localhost:5173/auth/microsoft/callback

# Slack
VITE_SLACK_CLIENT_ID=your_slack_client_id
VITE_SLACK_CLIENT_SECRET=your_slack_client_secret
VITE_SLACK_SIGNING_SECRET=your_slack_signing_secret
VITE_SLACK_REDIRECT_URI=http://localhost:5173/auth/slack/callback

# Google Calendar (uses same credentials as Gmail)
VITE_GOOGLE_CALENDAR_API_KEY=your_google_api_key

# Discord
VITE_DISCORD_BOT_TOKEN=your_discord_bot_token
VITE_DISCORD_CLIENT_ID=your_discord_client_id
VITE_DISCORD_CLIENT_SECRET=your_discord_client_secret

# Jira
VITE_JIRA_DOMAIN=yourcompany.atlassian.net
VITE_JIRA_EMAIL=your_email@company.com
VITE_JIRA_API_TOKEN=your_jira_api_token

# GitHub
VITE_GITHUB_PERSONAL_ACCESS_TOKEN=your_github_pat
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_GITHUB_CLIENT_SECRET=your_github_client_secret
```

---

## 1️⃣ Gmail Integration

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: "Strategic Coworker"
3. Enable **Gmail API**

### Step 2: Create OAuth Credentials
1. Navigate to **APIs & Services > Credentials**
2. Click **+ CREATE CREDENTIALS > OAuth client ID**
3. Choose **Web application**
4. Add authorized redirect URI: `http://localhost:5173/auth/gmail/callback`
5. Save and copy your **Client ID** and **Client Secret**

### Step 3: Configure Scopes
Required scopes:
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.modify`
- `https://www.googleapis.com/auth/gmail.labels`

### Step 4: Add to .env
```env
VITE_GMAIL_CLIENT_ID=123456789.apps.googleusercontent.com
VITE_GMAIL_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
```

---

## 2️⃣ Microsoft Integration (Teams + Outlook + Calendar)

### Step 1: Register App in Azure
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory > App registrations**
3. Click **+ New registration**
4. Name: "Strategic Coworker AI"
5. Redirect URI: `http://localhost:5173/auth/microsoft/callback`

### Step 2: API Permissions
Add these Microsoft Graph permissions:
- `Mail.Read` - Read emails
- `Mail.ReadWrite` - Modify emails
- `Chat.Read` - Read Teams messages
- `ChannelMessage.Read.All` - Read channel messages
- `Calendars.Read` - Read calendar events
- `Calendars.ReadWrite` - Manage calendar
- `User.Read` - Basic profile

Grant admin consent if required.

### Step 3: Create Client Secret
1. Go to **Certificates & secrets**
2. Click **+ New client secret**
3. Copy the secret value immediately (shown only once)

### Step 4: Add to .env
```env
VITE_MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789abc
VITE_MICROSOFT_CLIENT_SECRET=abc~123456789
VITE_MICROSOFT_TENANT_ID=your-tenant-id
```

---

## 3️⃣ Slack Integration

### Step 1: Create Slack App
1. Go to [Slack API](https://api.slack.com/apps)
2. Click **Create New App > From scratch**
3. Name: "Strategic Coworker AI"
4. Choose your workspace

### Step 2: OAuth & Permissions
Add Bot Token Scopes:
- `channels:history` - Read public channels
- `channels:read` - View channel info
- `chat:write` - Send messages
- `groups:history` - Read private channels
- `im:history` - Read direct messages
- `users:read` - View users

### Step 3: Event Subscriptions (Optional)
Enable events for real-time updates:
- `message.channels`
- `message.groups`
- `message.im`

### Step 4: Install to Workspace
1. Click **Install to Workspace**
2. Authorize the app
3. Copy **Bot User OAuth Token**

### Step 5: Add to .env
```env
VITE_SLACK_CLIENT_ID=123456789.123456789
VITE_SLACK_CLIENT_SECRET=abc123def456
VITE_SLACK_SIGNING_SECRET=abc123def456ghi789
```

---

## 4️⃣ Discord Integration

### Step 1: Create Discord Bot
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Name: "Strategic Coworker AI"

### Step 2: Create Bot
1. Navigate to **Bot** tab
2. Click **Add Bot**
3. Enable these Privileged Gateway Intents:
   - Message Content Intent
   - Server Members Intent

### Step 3: Get Bot Token
1. Click **Reset Token**
2. Copy the token (shown only once)

### Step 4: Invite Bot to Server
1. Go to **OAuth2 > URL Generator**
2. Select scopes: `bot`, `applications.commands`
3. Select permissions: `Read Messages`, `Send Messages`, `Read Message History`
4. Copy generated URL and visit it to add bot to your server

### Step 5: Add to .env
```env
VITE_DISCORD_BOT_TOKEN=MTIzNDU2Nzg5ABC.DEF.GHI-JKL_MNO
VITE_DISCORD_CLIENT_ID=123456789012345678
```

---

## 5️⃣ Jira Integration

### Step 1: Create API Token
1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Label: "Strategic Coworker AI"
4. Copy the token

### Step 2: Get Your Domain
Your Jira domain is typically: `yourcompany.atlassian.net`

### Step 3: Add to .env
```env
VITE_JIRA_DOMAIN=yourcompany.atlassian.net
VITE_JIRA_EMAIL=you@company.com
VITE_JIRA_API_TOKEN=ATATT3xFfGF0...
```

---

## 6️⃣ GitHub Integration

### Step 1: Create Personal Access Token
1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Select scopes:
   - `repo` - Full repository access
   - `notifications` - Read notifications
   - `read:org` - Read organization data
   - `read:user` - Read user profile

### Step 2: For OAuth (Optional)
1. Go to **OAuth Apps > New OAuth App**
2. Application name: "Strategic Coworker AI"
3. Homepage URL: `http://localhost:5173`
4. Authorization callback URL: `http://localhost:5173/auth/github/callback`

### Step 3: Add to .env
```env
VITE_GITHUB_PERSONAL_ACCESS_TOKEN=ghp_abc123def456ghi789
VITE_GITHUB_CLIENT_ID=Iv1.abc123def456
```

---

## 🔄 Testing Your Integrations

### Test Connection Status
Once configured, your app will show connection status for each integration on the Dashboard:
- 🟢 **Connected** - Integration is active and syncing
- 🔴 **Error** - Check credentials or permissions
- 🟡 **Syncing** - Currently fetching data

### Verify Data Flow
1. Open the Dashboard
2. Check each integration card
3. Look for recent messages/events
4. Test sending a message if applicable

---

## 🎯 Integration Priorities

### Start With (Most Common):
1. **Gmail/Outlook** - Email is critical
2. **Microsoft Teams/Slack** - Team communication
3. **Google Calendar** - Schedule awareness

### Add Later:
4. **GitHub** - For technical teams
5. **Jira** - For project tracking
6. **Discord** - For community management

---

## 🔒 Security Best Practices

1. **Never commit .env file** - Already in .gitignore
2. **Use OAuth when possible** - More secure than API keys
3. **Limit permissions** - Only request what you need
4. **Rotate keys regularly** - Update tokens every 90 days
5. **Monitor access logs** - Check API usage in each platform

---

## 🐛 Troubleshooting

### "Authentication Failed"
- ✅ Check API keys are correct in `.env`
- ✅ Verify redirect URIs match exactly
- ✅ Ensure app has required permissions
- ✅ Restart dev server after changing `.env`

### "No Data Appearing"
- ✅ Check integration is enabled
- ✅ Verify account has messages/events
- ✅ Look for rate limiting errors in console
- ✅ Check date filters aren't too restrictive

### "OAuth Redirect Error"
- ✅ Ensure redirect URI includes protocol (`http://`)
- ✅ Port must match (default: 5173)
- ✅ Clear browser cache and cookies
- ✅ Try incognito/private mode

---

## 📞 Support Resources

- **Gmail API**: https://developers.google.com/gmail/api
- **Microsoft Graph**: https://docs.microsoft.com/en-us/graph/
- **Slack API**: https://api.slack.com/docs
- **Discord API**: https://discord.com/developers/docs
- **Jira REST API**: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
- **GitHub API**: https://docs.github.com/en/rest

---

## ✅ Next Steps

After completing setup:
1. Restart your development server: `npm run dev`
2. Open the app and navigate to **Settings > Integrations**
3. Click **Connect** on each integration
4. Complete OAuth flows
5. Start receiving real data in your Strategic Coworker AI!

---

**Need Help?** Check the console logs for detailed error messages and API responses.
