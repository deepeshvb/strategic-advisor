# Strategic Advisor - Complete Implementation Guide

**Last Updated:** February 2026  
**Estimated Setup Time:** 2-4 hours (depending on integrations)

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Core Setup: Anthropic API](#core-setup-anthropic-api)
4. [Integration Setup](#integration-setup)
   - [Gmail](#gmail-integration)
   - [Microsoft 365 (Teams, Outlook, Calendar)](#microsoft-365-integration)
   - [Slack](#slack-integration)
   - [Discord](#discord-integration)
   - [Jira](#jira-integration)
   - [GitHub](#github-integration)
5. [Testing & Verification](#testing--verification)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required
- **Node.js** v18+ and npm v9+
- **Git** for version control
- Active **Anthropic API account** with credits
- **Admin/workspace admin access** to the platforms you want to integrate

### Recommended
- Basic understanding of OAuth 2.0
- Access to company IT/security team for org-wide permissions
- Test environment before production rollout

### Time Commitment
- **Basic Setup** (Anthropic only): 15 minutes
- **Personal Integrations** (your own inbox/channels): 1-2 hours
- **Organization-Wide Scanning**: 2-4 hours (requires IT coordination)

---

## Initial Setup

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/deepeshvb/strategic-advisor.git
cd strategic-advisor

# Install dependencies
npm install
```

### Step 2: Create Environment File

```bash
# Copy the example environment file
cp .env.example .env
```

### Step 3: Initial Run (Synthetic Data)

```bash
# Start development server
npm run dev
```

Open `http://localhost:5173` - you should see the app running with synthetic demo data.

---

## Core Setup: Anthropic API

**Required for all functionality**

### Step 1: Get Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **API Keys**
4. Click **Create Key**
5. Name it: "Strategic Advisor"
6. Copy the key (starts with `sk-ant-api03-...`)

### Step 2: Add to .env

```env
VITE_ANTHROPIC_API_KEY=sk-ant-api03-your_actual_key_here
```

### Step 3: Verify

```bash
# Restart dev server
npm run dev
```

Open the app and click **Daily Briefing** - you should get a response from Claude.

**Cost Estimate:** ~$0.01-0.10 per request depending on context size

---

## Integration Setup

Choose which platforms to integrate. You can start with just one and add more later.

---

## Gmail Integration

**Access Level:** Personal inbox OR Organization-wide (all mailboxes)

### For Personal Gmail Access

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select Project** → **New Project**
3. Name: "Strategic Advisor"
4. Click **Create**

#### Step 2: Enable Gmail API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click **Gmail API** → **Enable**

#### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (for personal use)
3. Fill in required fields:
   - App name: "Strategic Advisor"
   - User support email: your email
   - Developer contact: your email
4. Click **Save and Continue**
5. **Scopes**: Click **Add or Remove Scopes**
   - Add: `https://www.googleapis.com/auth/gmail.readonly`
   - Add: `https://www.googleapis.com/auth/gmail.modify`
6. Click **Save and Continue**
7. **Test users**: Add your email address
8. Click **Save and Continue**

#### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: "Strategic Advisor Web"
5. **Authorized redirect URIs**: Add
   - `http://localhost:5173/auth/gmail/callback`
   - `http://localhost:5173` (fallback)
6. Click **Create**
7. **Copy the Client ID and Client Secret**

#### Step 5: Add to .env

```env
VITE_GMAIL_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
VITE_GMAIL_CLIENT_SECRET=GOCSPX-your_secret_here
VITE_GMAIL_REDIRECT_URI=http://localhost:5173/auth/gmail/callback
```

### For Organization-Wide Gmail Access

**Requires:** Google Workspace Super Admin access

#### Step 1: Create Service Account

1. In Google Cloud Console, go to **IAM & Admin** → **Service Accounts**
2. Click **+ Create Service Account**
3. Name: "Strategic Advisor Scanner"
4. Click **Create and Continue**
5. Role: **None needed** (using Domain-Wide Delegation)
6. Click **Done**

#### Step 2: Enable Domain-Wide Delegation

1. Click on the service account you just created
2. Go to **Keys** tab → **Add Key** → **Create new key**
3. Type: **JSON** → Click **Create**
4. Save the JSON file securely (rename to `gmail-service-account.json`)
5. Go to **Details** tab
6. Under **Advanced settings**, click **View Google Workspace Admin Console**
7. Copy the **Client ID** (numeric)

#### Step 3: Configure Google Workspace Admin

1. Go to [Google Admin Console](https://admin.google.com/)
2. Navigate to **Security** → **Access and data control** → **API Controls**
3. Click **Manage Domain Wide Delegation**
4. Click **Add new**
5. **Client ID**: Paste the service account Client ID
6. **OAuth Scopes**: Add these comma-separated:
   ```
   https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/admin.directory.user.readonly
   ```
7. Click **Authorize**

#### Step 4: Add to .env

```env
VITE_GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./gmail-service-account.json
VITE_GOOGLE_DOMAIN=yourcompany.com
VITE_SCAN_ALL_MAILBOXES=true
```

**⚠️ Important:** Add `gmail-service-account.json` to `.gitignore` to never commit credentials!

---

## Microsoft 365 Integration

**Provides:** Teams, Outlook Email, and Calendar

**Access Level:** Personal OR Organization-wide

### For Personal/Team Access

#### Step 1: Register App in Azure

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory**
3. Click **App registrations** → **+ New registration**
4. Fill in:
   - Name: "Strategic Advisor"
   - Supported account types: **Accounts in this organizational directory only**
   - Redirect URI: 
     - Type: **Web**
     - URI: `http://localhost:5173/auth/microsoft/callback`
5. Click **Register**
6. **Copy the Application (client) ID**
7. **Copy the Directory (tenant) ID**

#### Step 2: Create Client Secret

1. In your app, go to **Certificates & secrets**
2. Click **+ New client secret**
3. Description: "Strategic Advisor Key"
4. Expires: Choose duration (recommend 12 months)
5. Click **Add**
6. **Copy the Value immediately** (shown only once!)

#### Step 3: Configure API Permissions

1. Go to **API permissions**
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions** (for personal access)
5. Add these permissions:
   - `Mail.Read` - Read user mail
   - `Mail.ReadWrite` - Manage user mail
   - `Calendars.Read` - Read calendars
   - `Chat.Read` - Read Teams chat messages
   - `ChannelMessage.Read.All` - Read Teams channel messages
   - `User.Read` - Sign in and read profile
6. Click **Add permissions**
7. Click **Grant admin consent for [Your Org]** (if available)

#### Step 4: Add to .env

```env
VITE_MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789abc
VITE_MICROSOFT_CLIENT_SECRET=abc~123456789_your_secret_here
VITE_MICROSOFT_TENANT_ID=87654321-4321-4321-4321-987654321abc
VITE_MICROSOFT_REDIRECT_URI=http://localhost:5173/auth/microsoft/callback
```

### For Organization-Wide Access

**Requires:** Global Administrator or Application Administrator role

#### Follow Steps 1-2 above, then modify Step 3:

**Use Application Permissions instead of Delegated:**

1. In **API permissions**, click **+ Add a permission**
2. Select **Microsoft Graph**
3. Choose **Application permissions** (not Delegated)
4. Add these:
   - `Mail.Read` - Read mail in all mailboxes
   - `Calendars.Read` - Read calendars in all mailboxes
   - `Chat.Read.All` - Read all chat messages
   - `ChannelMessage.Read.All` - Read all channel messages
   - `User.Read.All` - Read all users' profiles
5. **Critical:** Click **Grant admin consent for [Your Org]**
6. Confirm the consent

#### Add to .env

```env
VITE_MICROSOFT_CLIENT_ID=your_client_id
VITE_MICROSOFT_CLIENT_SECRET=your_client_secret
VITE_MICROSOFT_TENANT_ID=your_tenant_id
VITE_MICROSOFT_GRAPH_SCOPE=.default
VITE_SCAN_ALL_MAILBOXES=true
VITE_SCAN_ALL_TEAMS=true
```

**Authentication:** Use Client Credentials flow (app-only auth)

---

## Slack Integration

**Access Level:** Workspace channels OR Enterprise Grid (all workspaces)

### Step 1: Create Slack App

1. Go to [Slack API](https://api.slack.com/apps)
2. Click **Create New App**
3. Choose **From scratch**
4. App Name: "Strategic Advisor"
5. Pick your workspace
6. Click **Create App**

### Step 2: Configure OAuth & Permissions

1. In your app settings, go to **OAuth & Permissions**
2. Scroll to **Scopes**
3. Under **Bot Token Scopes**, add:
   - `channels:history` - View messages in public channels
   - `channels:read` - View basic channel info
   - `groups:history` - View messages in private channels
   - `groups:read` - View basic private channel info
   - `im:history` - View direct messages
   - `im:read` - View DM info
   - `mpim:history` - View group DM messages
   - `users:read` - View users
   - `team:read` - View workspace info

### Step 3: Install to Workspace

1. Scroll up to **OAuth Tokens**
2. Click **Install to Workspace**
3. Review permissions
4. Click **Allow**
5. **Copy the Bot User OAuth Token** (starts with `xoxb-`)

### Step 4: Get Additional Credentials

1. Go to **Basic Information**
2. Scroll to **App Credentials**
3. **Copy the Client ID**
4. **Copy the Client Secret**
5. **Copy the Signing Secret**

### Step 5: Add to .env

```env
VITE_SLACK_CLIENT_ID=1234567890.1234567890
VITE_SLACK_CLIENT_SECRET=your_slack_client_secret_here
VITE_SLACK_SIGNING_SECRET=your_slack_signing_secret_here
VITE_SLACK_BOT_TOKEN=xoxb-your-slack-bot-token-here
VITE_SLACK_REDIRECT_URI=http://localhost:5173/auth/slack/callback
```

### Optional: Enable Event Subscriptions (Real-time Updates)

1. Go to **Event Subscriptions**
2. Toggle **Enable Events** to On
3. Request URL: Your server endpoint (need backend for this)
4. Subscribe to bot events:
   - `message.channels`
   - `message.groups`
   - `message.im`

---

## Discord Integration

**Access Level:** Specific servers where bot is added

### Step 1: Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Name: "Strategic Advisor"
4. Click **Create**

### Step 2: Create Bot

1. In your application, go to **Bot** tab
2. Click **Add Bot** → Confirm
3. Under **Privileged Gateway Intents**, enable:
   - ✅ **Presence Intent**
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent** (Critical!)
4. Click **Reset Token** → Confirm
5. **Copy the Bot Token** (shown once!)

### Step 3: Get Application Credentials

1. Go to **OAuth2** tab
2. **Copy the Client ID**
3. **Copy the Client Secret**

### Step 4: Invite Bot to Server

1. Go to **OAuth2** → **URL Generator**
2. Select **Scopes:**
   - `bot`
   - `applications.commands`
3. Select **Bot Permissions:**
   - `Read Messages/View Channels`
   - `Read Message History`
   - `Send Messages`
4. Copy the generated URL
5. Open URL in browser
6. Select your server
7. Click **Authorize**

### Step 5: Add to .env

```env
VITE_DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.AbCdEf.GhIjKlMnOpQrStUvWxYz123456
VITE_DISCORD_CLIENT_ID=123456789012345678
VITE_DISCORD_CLIENT_SECRET=abcdef123456789abcdef123456789ab
```

---

## Jira Integration

**Access Level:** All projects you have access to

### Step 1: Create API Token

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Label: "Strategic Advisor"
4. Click **Create**
5. **Copy the token** (shown once!)

### Step 2: Get Your Jira Domain

Your Jira Cloud domain is typically: `yourcompany.atlassian.net`

### Step 3: Add to .env

```env
VITE_JIRA_DOMAIN=yourcompany.atlassian.net
VITE_JIRA_EMAIL=your.email@company.com
VITE_JIRA_API_TOKEN=ATATT3xFfGF0abcdefghijklmnopqrstuvwxyz123456
```

---

## GitHub Integration

**Access Level:** Repositories you have access to

### Step 1: Create Personal Access Token (Classic)

1. Go to [GitHub Settings](https://github.com/settings/tokens)
2. Click **Generate new token** → **Generate new token (classic)**
3. Note: "Strategic Advisor"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `read:org` (Read org data)
   - ✅ `notifications` (Access notifications)
   - ✅ `read:user` (Read user profile)
5. Click **Generate token**
6. **Copy the token** (starts with `ghp_`)

### Optional: Create OAuth App (for team use)

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - Application name: "Strategic Advisor"
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5173/auth/github/callback`
4. Click **Register application**
5. **Copy Client ID**
6. Click **Generate a new client secret**
7. **Copy Client Secret**

### Step 2: Add to .env

```env
# Personal Access Token
VITE_GITHUB_PERSONAL_ACCESS_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz123456789

# OAuth (optional)
VITE_GITHUB_CLIENT_ID=Iv1.abc123def456
VITE_GITHUB_CLIENT_SECRET=abcdef123456789abcdef123456789abcdef12
VITE_GITHUB_REDIRECT_URI=http://localhost:5173/auth/github/callback
```

---

## Testing & Verification

### Step 1: Verify Environment

```bash
# Check .env file exists and has required keys
cat .env | grep VITE_ANTHROPIC_API_KEY
```

Should show your API key (first few characters)

### Step 2: Run Build

```bash
npm run build
```

Should complete with no TypeScript errors.

### Step 3: Start Development Server

```bash
npm run dev
```

### Step 4: Test Core Functionality

1. Open `http://localhost:5173`
2. Click **Daily Briefing**
3. Verify Claude responds with strategic analysis
4. Test voice input (microphone icon)
5. Test voice output (speaker icon)

### Step 5: Test Integrations

1. Navigate to **Settings** (in sidebar)
2. Check each enabled integration shows **green checkmark**
3. If yellow warning: credentials not configured
4. If red X: check credentials and permissions

### Step 6: Test Data Flow

1. Go to **Dashboard**
2. Check "Integration Status" section
3. Verify counts for:
   - Total messages
   - Unread count
   - Channels connected
4. Go to **Chat**
5. Ask: "What conflicts do you see between teams?"
6. Verify response includes data from your integrations

---

## Production Deployment

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Settings → Environment Variables → Add each VITE_* variable
```

### Option 2: Docker

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

```bash
# Build and run
docker build -t strategic-advisor .
docker run -p 5173:5173 --env-file .env strategic-advisor
```

### Option 3: Traditional Hosting

```bash
# Build production bundle
npm run build

# Output in dist/ folder
# Upload dist/ to your web server
# Ensure environment variables are set on server
```

---

## Troubleshooting

### "API Key Error"

**Problem:** "Could not resolve authentication method"

**Solution:**
1. Verify `.env` file is in project root (not `src/`)
2. Confirm variable name is exactly `VITE_ANTHROPIC_API_KEY`
3. Restart dev server after changing `.env`
4. Check for spaces or quotes around the key (remove them)

### "No Data Appearing"

**Problem:** Integration shows connected but no messages

**Solution:**
1. Check you have messages/emails in the account
2. Verify API permissions include "read" access
3. Check browser console (F12) for API errors
4. Try revoking and re-granting OAuth access
5. Ensure admin consent was granted (for org-wide access)

### "OAuth Redirect Error"

**Problem:** "redirect_uri_mismatch"

**Solution:**
1. Verify redirect URI exactly matches (including protocol, port)
2. No trailing slash in redirect URI
3. Check you added it to both .env AND the OAuth app config
4. Clear browser cache and cookies
5. Try in incognito mode

### "CORS Errors"

**Problem:** Browser blocks API requests

**Solution:**
- Most modern APIs support CORS
- For Gmail/Microsoft: Ensure you're using official SDKs
- May need backend proxy for some APIs
- Check API documentation for CORS support

### "Rate Limiting"

**Problem:** "Too many requests"

**Solution:**
1. Reduce sync frequency in settings
2. Add retry logic with exponential backoff
3. Check API rate limits documentation
4. Consider caching responses locally
5. Upgrade to higher API tier if available

### "Permission Denied"

**Problem:** "Insufficient permissions"

**Solution:**
1. Re-check required scopes/permissions
2. Grant admin consent (for org-wide)
3. Verify user/service account has necessary roles
4. Check workspace/organization admin settings
5. May need to wait for permission propagation (up to 24hrs)

---

## Support & Resources

### Documentation
- **Anthropic:** https://docs.anthropic.com/
- **Gmail API:** https://developers.google.com/gmail/api
- **Microsoft Graph:** https://docs.microsoft.com/en-us/graph/
- **Slack API:** https://api.slack.com/docs
- **Discord API:** https://discord.com/developers/docs
- **Jira REST API:** https://developer.atlassian.com/cloud/jira/platform/rest/v3/
- **GitHub API:** https://docs.github.com/en/rest

### Getting Help
- Check the [GitHub Issues](https://github.com/deepeshvb/strategic-advisor/issues)
- Review `ORGANIZATION-WIDE-SCANNING.md` for advanced setup
- Review `REAL-INTEGRATIONS-SETUP.md` for integration details

---

## Security Checklist

✅ `.env` file is in `.gitignore` (never commit!)  
✅ Service account keys stored securely  
✅ OAuth redirect URIs use HTTPS in production  
✅ API keys rotated every 90 days  
✅ Minimum required permissions granted  
✅ Audit logs enabled on integrated platforms  
✅ Employee notification provided (for org-wide scanning)  
✅ Data retention policy documented  
✅ Compliance review completed (GDPR, SOC2, etc.)  

---

## Next Steps

After successful setup:

1. ✅ Configure your first integration
2. ✅ Test with your own data
3. ✅ Review daily briefings for a week
4. ✅ Customize system prompt if needed (`src/prompts/ceo-system-prompt.ts`)
5. ✅ Add more integrations gradually
6. ✅ Train team members on using the tool
7. ✅ Set up organization-wide scanning (with IT team)
8. ✅ Schedule regular API key rotation
9. ✅ Monitor usage and costs

---

**Questions?** Review the documentation or open an issue on GitHub.

**Ready to scale?** See `ORGANIZATION-WIDE-SCANNING.md` for enterprise deployment.
