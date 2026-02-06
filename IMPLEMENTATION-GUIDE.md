# Strategic Advisor - Complete Implementation Guide

**Last Updated:** February 2026  
**Estimated Setup Time:** 2-4 hours (depending on integrations)

---

## 🔐 Critical Security Notice

**Most integrations require a backend server.** The Strategic Advisor Settings UI clearly identifies:

- **🟢 Frontend-Safe Fields** - Can be configured in the UI (Client IDs, Redirect URIs, Tenant IDs)
- **🔴 Backend-Only Fields** - MUST be stored on a secure backend server (Secrets, Tokens, API Keys)

**Why Backend is Required:**
- OAuth Client Secrets grant full application access
- Bot Tokens (Slack/Discord) provide workspace-wide access
- API Tokens (Jira/GitHub) grant full account access
- Service Account Keys enable organization-wide scanning

**Never expose secrets in frontend code or browser.** See [BACKEND-SETUP-GUIDE.md](BACKEND-SETUP-GUIDE.md) for implementation.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Privacy-First Architecture](#privacy-first-architecture)
4. [Local LLM Setup (Recommended)](#local-llm-setup-recommended)
5. [Company Configuration](#company-configuration)
6. [Understanding Frontend vs Backend Configuration](#understanding-frontend-vs-backend-configuration)
7. [Cloud API Setup (Alternative)](#cloud-api-setup-alternative)
8. [Integration Setup](#integration-setup)
   - [Gmail](#gmail-integration)
   - [Microsoft 365 (Teams, Outlook, Calendar)](#microsoft-365-integration)
   - [Slack](#slack-integration)
   - [Discord](#discord-integration)
   - [Jira](#jira-integration)
   - [GitHub](#github-integration)
9. [Backend Server Setup](#backend-server-setup)
10. [Testing & Verification](#testing--verification)
11. [Production Deployment](#production-deployment)
12. [Troubleshooting](#troubleshooting)

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
- Backend development experience (Node.js, Python, or similar)
- Test environment before production rollout

### Time Commitment
- **Basic Setup** (Anthropic only, synthetic data): 15 minutes
- **Frontend-Only** (OAuth personal access): 1-2 hours
- **Backend + Organization-Wide**: 4-8 hours (requires server setup)

### Three Implementation Paths

**Path A: Local LLM Only (Maximum Privacy) ⭐ RECOMMENDED**
- Install Ollama for 100% local AI processing
- Configure companies in UI
- Your data NEVER leaves your computer
- $0 API costs
- Perfect for sensitive company data
- Time: 30 minutes

**Path B: Cloud API (Quick Start)**
- Use Anthropic Claude API
- Faster setup (no local installation)
- Better for testing/demos
- ⚠️ Company data sent to third party
- Time: 15 minutes

**Path C: Hybrid (Local AI + Real Integrations)**
- Local LLM for AI processing (private)
- Backend server for organization-wide data scanning
- Best of both: privacy + full features
- Time: 4-8 hours

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

## Privacy-First Architecture

### 🔒 Your Data, Your Machine

**The Strategic Advisor prioritizes privacy:**

1. **Local AI Processing** - Uses Ollama (local LLM) by default
   - All AI inference happens on YOUR computer
   - Company data NEVER sent to cloud
   - $0 ongoing costs
   
2. **Local Data Storage** - Companies, decisions, history stored in browser localStorage
   - No external database
   - Complete control over your data
   
3. **Optional Cloud Fallback** - Can use Claude API if Ollama unavailable
   - Explicitly warns you before sending data to cloud
   - Easy toggle between local/cloud

### Privacy Comparison

| Feature | Local LLM (Ollama) | Cloud API (Claude) |
|---------|-------------------|-------------------|
| **Privacy** | 🟢 100% Private | 🟡 Data sent to Anthropic |
| **Cost** | 🟢 $0/month | 🔴 $50-500/month |
| **Speed** | 🟡 Moderate (depends on hardware) | 🟢 Fast |
| **Quality** | 🟢 Excellent (70B model) | 🟢 Excellent |
| **Offline** | 🟢 Works offline | 🔴 Requires internet |
| **Setup** | 🟡 15-30 minutes | 🟢 5 minutes |

**Recommendation:** Use Local LLM for production with sensitive data.

---

## Local LLM Setup (Recommended)

**For complete privacy, install Ollama - your data stays on your machine.**

### Step 1: Install Ollama

**Windows:**
1. Download from https://ollama.com/download/windows
2. Run installer
3. Ollama starts automatically as Windows service

**macOS:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Step 2: Download AI Model

Choose based on your RAM:

```bash
# Best quality (48GB+ RAM) - Recommended if you have the hardware
ollama pull llama3.1:70b

# Good quality (16GB+ RAM) - Recommended for most users
ollama pull llama3.1:8b

# Fast (8GB RAM) - Good for lower-end machines
ollama pull mistral:7b

# Lightweight (4GB RAM) - Minimum viable option
ollama pull phi3:3.8b
```

**Download takes 2-10 minutes** depending on model size and internet speed.

### Step 3: Verify Installation

```bash
# Check Ollama is running
curl http://localhost:11434
# Should return: "Ollama is running"

# List installed models
ollama list

# Test the model
ollama run llama3.1:8b "What are key strategies for IT consulting?"
```

### Step 4: Configure in App

1. Start Strategic Advisor: `npm run dev`
2. Go to **Settings** → **Local LLM** tab
3. Click **Check Status** - should show green "Ollama is Running"
4. Select your model from dropdown
5. Click **Enable Local LLM** button
6. Done! All queries now 100% private

### Step 5: Verify Privacy Mode

- Browser console should show:
  ```
  🔒 Using LOCAL LLM (privacy mode)
  🧠 Generating response with LOCAL LLM (Ollama)...
  🔒 Privacy: All data processed locally, NEVER sent to cloud
  ```

**See [OLLAMA-SETUP.md](OLLAMA-SETUP.md) for detailed guide including troubleshooting.**

---

## Company Configuration

### Your Companies Are Pre-Configured!

The app automatically initializes with your companies:

**✅ Pre-configured:**
1. **Othain Group** - Digital transformation consultancy
   - ISO-certified (9001, 27001, 20000)
   - Services: SAP/Oracle, QA/Testing, RPA, F&A automation
   - ~135 employees
   - Target: Enterprise clients in finance, healthcare, retail, insurance

2. **Jersey Technology Partners** - IT services & digital transformation
   - Product engineering, digital services, AI solutions
   - Global delivery model
   - Target: Mid-market companies (50-500 employees)
   - Focus: AI/ML consulting, cloud migration

3. **Strivio LLC** - Executive services (This platform!)
   - Strategic advisory and executive intelligence
   - AI-driven decision support for CEOs
   - Target: 7-8 figure businesses
   - Stage: Startup/MVP

### Managing Companies in UI

**View/Edit Companies:**
1. Go to **Settings** → **Companies** tab
2. See all your companies listed
3. Click **Set Active** to switch between them
4. Click **Edit** to modify details
5. Click **Add Company** to add more

**Company Selector (Sidebar):**
- Shows active company at all times
- Quick switcher dropdown
- Context changes instantly when you switch

**What You Can Configure:**
- Company name, industry, stage
- Number of employees
- Description of services
- Current strategic goals
- Competitors to track
- Target market
- Departments and stakeholders
- AI behavior settings (aggressive vs. conservative)

### Strategic Intelligence Per Company

Each company gets:
- **Separate chat history**
- **Company-specific strategic goals**
- **Competitor tracking**
- **Industry-specific insights**
- **Historical decision tracking**
- **Custom AI personality** (risk tolerance, focus areas)

### Add New Companies

1. Settings → Companies → **Add Company**
2. Fill in:
   - **Basic Info**: Name, industry, stage, employees
   - **Description**: What the company does
   - **Strategic Goals**: Current objectives (one per line)
   - **Competitors**: Companies to monitor (comma-separated)
   - **Target Market**: Who you serve
3. Click **Add Company**
4. Switch to it via Company Selector

**Example Goals for IT Consulting:**
```
Expand AI/ML consulting practice
Acquire 15 new enterprise clients
Build strategic partnership with Microsoft
Launch proprietary product/IP
Increase profit margins to 25%
```

---

## Understanding Frontend vs Backend Configuration

### What Can Be in Frontend (Browser)

**✅ Safe for Frontend:**
- Client IDs (public identifiers)
- Application IDs
- Tenant IDs
- Redirect URIs
- Domain names
- Public configuration values

These appear as **🟢 Frontend Safe** in the Settings UI.

### What MUST Be in Backend (Server)

**❌ Never in Frontend:**
- OAuth Client Secrets
- API Tokens (Personal Access Tokens)
- Bot Tokens (Slack, Discord)
- Service Account Keys (JSON files)
- Signing Secrets
- Any credential that grants full access

These appear as **🔴 Backend Only** in the Settings UI and are disabled (cannot be entered).

### Using the Settings UI

1. Navigate to **Settings** in the sidebar
2. Enable integrations you want to use
3. **Frontend-Safe fields** - Enter directly in the UI (green badges)
4. **Backend-Only fields** - These are disabled and show red warning
5. For backend-only fields, see [Backend Server Setup](#backend-server-setup)

---

## Cloud API Setup (Alternative)

**⚠️ NOT RECOMMENDED if you have sensitive company data**

### When to Use Cloud API:
- Quick testing/demo only
- No local hardware (using cloud IDE)
- Don't have RAM for local models
- Okay with data being sent to Anthropic

### When to Use Local LLM (Ollama):
- **Production use with sensitive data** ✅
- Organization-wide email/Teams scanning
- Competitor intelligence
- Financial information
- Strategic decisions
- **Always recommended for privacy**

---

## Core Setup: Anthropic API (Optional - Only if NOT using Local LLM)

**Skip this section if you're using Local LLM (recommended)**

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

**⚠️ Privacy Warning:** When using cloud API:
- Your company data is sent to Anthropic servers
- Organization-wide emails/chats transmitted externally
- Strategic decisions visible to third party
- **For sensitive data, use Local LLM instead**

To force cloud API usage even if Ollama is installed:
1. Go to Settings → Local LLM
2. Click "Use Cloud API" button
3. Confirm the privacy warning

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

**Requires:** 
- Google Workspace Super Admin access
- **Backend server** (service account keys cannot be in frontend)

**⚠️ This integration requires backend - see [Backend Server Setup](#backend-server-setup)**

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

#### Step 4: Configure on Backend Server

**🔴 All fields are Backend-Only** - These appear disabled in Settings UI:

- **Service Account JSON Key**: Must be uploaded to secure backend storage
- **Domain**: Can be configured in UI
- **Scan All Mailboxes**: Can be configured in UI

**Backend Configuration** (in backend server's `.env`):

```env
# Backend server .env (NEVER in frontend)
GOOGLE_SERVICE_ACCOUNT_KEY=./gmail-service-account.json
GOOGLE_DOMAIN=yourcompany.com
SCAN_ALL_MAILBOXES=true
```

**⚠️ Critical:** 
- Service account key MUST be on backend server
- Never commit `gmail-service-account.json`
- See [BACKEND-SETUP-GUIDE.md](BACKEND-SETUP-GUIDE.md) for implementation

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

#### Step 4: Configure in Settings UI

**Frontend-Safe (Enter in UI):**
1. Go to **Settings** → Enable "Microsoft 365 (Personal Access)"
2. Enter **Client ID**: `12345678-1234-...` (🟢 Frontend Safe)
3. Enter **Tenant ID**: `87654321-4321-...` (🟢 Frontend Safe)
4. Enter **Redirect URI**: `http://localhost:5173/auth/microsoft/callback` (🟢 Frontend Safe)

**Backend-Only (Cannot Enter in UI):**
- **Client Secret**: Shows 🔴 Backend Only warning
- Must be stored on backend server

**Backend Configuration** (in backend server's `.env`):

```env
# Frontend .env
VITE_MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789abc
VITE_MICROSOFT_TENANT_ID=87654321-4321-4321-4321-987654321abc
VITE_MICROSOFT_REDIRECT_URI=http://localhost:5173/auth/microsoft/callback

# Backend .env (NEVER in frontend)
MICROSOFT_CLIENT_SECRET=abc~123456789_your_secret_here
```

### For Organization-Wide Access

**Requires:** 
- Global Administrator or Application Administrator role
- **Backend server** (application permissions require server-side auth)

**⚠️ This integration requires backend** - All credentials are backend-only

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

#### Configure on Backend Server

**🔴 All credentials are Backend-Only:**

**Backend Configuration** (in backend server's `.env`):

```env
# Backend server .env (NEVER in frontend)
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_TENANT_ID=your_tenant_id
MICROSOFT_GRAPH_SCOPE=.default
SCAN_ALL_MAILBOXES=true
SCAN_ALL_TEAMS=true
```

**Settings UI:**
- All fields show 🔴 Backend Only warnings
- "Microsoft 365 (Organization-Wide)" integration requires backend
- See [BACKEND-SETUP-GUIDE.md](BACKEND-SETUP-GUIDE.md) for server setup

**Authentication:** Uses Client Credentials flow (app-only, server-to-server)

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

### Step 5: Configure (Requires Backend)

**⚠️ Slack requires backend server** - Bot tokens grant full workspace access

**Frontend-Safe (Enter in UI):**
1. Go to **Settings** → Enable "Slack Workspace"
2. Enter **Client ID**: `1234567890.1234567890` (🟢 Frontend Safe)
3. Enter **Redirect URI**: `http://localhost:5173/auth/slack/callback` (🟢 Frontend Safe)

**Backend-Only (Cannot Enter in UI):**
All show 🔴 Backend Only warnings:
- Client Secret
- Signing Secret
- Bot User OAuth Token

**Backend Configuration** (in backend server's `.env`):

```env
# Frontend .env
VITE_SLACK_CLIENT_ID=1234567890.1234567890
VITE_SLACK_REDIRECT_URI=http://localhost:5173/auth/slack/callback

# Backend .env (NEVER in frontend)
SLACK_CLIENT_SECRET=your_slack_client_secret_here
SLACK_SIGNING_SECRET=your_slack_signing_secret_here
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token-here
```

**See [BACKEND-SETUP-GUIDE.md](BACKEND-SETUP-GUIDE.md)** for complete Slack backend implementation.

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

### Step 5: Configure (Requires Backend)

**⚠️ Discord requires backend server** - Bot tokens grant full server access

**Frontend-Safe (Enter in UI):**
1. Go to **Settings** → Enable "Discord Server"
2. Enter **Application ID**: `123456789012345678` (🟢 Frontend Safe)

**Backend-Only (Cannot Enter in UI):**
All show 🔴 Backend Only warnings:
- Client Secret
- Bot Token

**Backend Configuration** (in backend server's `.env`):

```env
# Frontend .env
VITE_DISCORD_CLIENT_ID=123456789012345678

# Backend .env (NEVER in frontend)
DISCORD_CLIENT_SECRET=abcdef123456789abcdef123456789ab
DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.AbCdEf.GhIjKlMnOpQrStUvWxYz123456
```

**See [BACKEND-SETUP-GUIDE.md](BACKEND-SETUP-GUIDE.md)** for Discord backend setup.

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

### Step 3: Configure (Requires Backend)

**⚠️ Jira requires backend server** - API tokens grant full account access

**Frontend-Safe (Enter in UI):**
1. Go to **Settings** → Enable "Jira Cloud"
2. Enter **Domain**: `yourcompany.atlassian.net` (🟢 Frontend Safe)

**Backend-Only (Cannot Enter in UI):**
All show 🔴 Backend Only warnings:
- Account Email
- API Token

**Backend Configuration** (in backend server's `.env`):

```env
# Frontend .env (or configure in UI)
JIRA_DOMAIN=yourcompany.atlassian.net

# Backend .env (NEVER in frontend)
JIRA_EMAIL=your.email@company.com
JIRA_API_TOKEN=ATATT3xFfGF0abcdefghijklmnopqrstuvwxyz123456
```

**See [BACKEND-SETUP-GUIDE.md](BACKEND-SETUP-GUIDE.md)** for Jira backend implementation.

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

## Backend Server Setup

**Most integrations require a backend server.** This is not optional for production use.

### Why Backend is Required

**Security:** Secrets and tokens that grant full access must never be in browser code:
- OAuth Client Secrets
- Bot Tokens (Slack, Discord)
- Service Account Keys (Google, Microsoft)
- Personal Access Tokens (GitHub, Jira)

**Capabilities:** Organization-wide scanning requires server-side authentication:
- Application permissions (vs. delegated)
- Service accounts with domain-wide delegation
- Bot tokens for workspace access

### Quick Start

See **[BACKEND-SETUP-GUIDE.md](BACKEND-SETUP-GUIDE.md)** for complete implementation including:

1. **Node.js + Express Backend Template**
   - Pre-configured API endpoints
   - Security middleware
   - OAuth token exchange
   - Integration proxies

2. **Environment Configuration**
   - Backend `.env` setup
   - Secret storage best practices
   - Production secrets management

3. **API Endpoints**
   - `/api/gmail/messages` - Proxy to Gmail API
   - `/api/microsoft/messages` - Proxy to Microsoft Graph
   - `/api/slack/messages` - Proxy to Slack API
   - `/api/discord/messages` - Proxy to Discord API
   - `/api/jira/issues` - Proxy to Jira API
   - `/api/github/notifications` - Proxy to GitHub API
   - `/api/ai/analyze` - Secure Claude AI proxy

4. **Deployment Guide**
   - Railway, Render, Heroku
   - AWS, Azure, Google Cloud
   - Docker containerization

### Frontend Integration

Update frontend to call backend instead of external APIs directly:

```typescript
// src/services/apiClient.ts
const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const backendAPI = {
  gmail: {
    fetchMessages: () => fetch(`${API_BASE}/api/gmail/messages`).then(r => r.json()),
  },
  // ... other integrations
};
```

Add to frontend `.env`:

```env
VITE_BACKEND_URL=http://localhost:3001
```

**Critical:** Backend must be running before frontend can access real data.

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

### Step 4: Verify Company Setup

1. Open `http://localhost:5173`
2. Check sidebar - should see **Company Selector** with your companies:
   - Othain Group
   - Jersey Technology Partners
   - Strivio LLC
3. Click to switch between companies
4. Go to **Settings** → **Companies** tab
5. Verify all 3 companies are pre-configured with goals and details

### Step 5: Test AI (Local or Cloud)

**If using Local LLM (Ollama):**
1. Check browser console (F12) for: `🔒 Using LOCAL LLM (privacy mode)`
2. Click **Daily Briefing**
3. Should see: `🧠 Generating response with LOCAL LLM (Ollama)...`
4. Response generated completely locally

**If using Cloud API:**
1. Click **Daily Briefing**
2. Should see: `☁️ Using cloud API (Ollama not available)`
3. Console shows warning about data being sent to Anthropic

### Step 6: Test Features

1. **Company switching**: Change active company in selector, verify context changes
2. **Voice input**: Test microphone icon
3. **Voice output**: Test speaker icon (stops on new request)
4. **Markdown rendering**: Responses show proper headings and formatting
5. **Strategic queries**: Ask "What should I focus on today?"

### Step 7: Configure Additional Settings

**Company Management:**
1. Settings → **Companies** tab
2. Edit company details, goals, competitors
3. Add new companies as needed
4. Export/import company data for backup

**Local LLM Settings:**
1. Settings → **Local LLM** tab
2. Check Ollama status
3. Select preferred model
4. Enable/disable privacy mode
5. View recommended models and system requirements

**Integration Settings:**
1. Settings → **Integrations** tab
2. Review security indicators:
   - 🟢 **Frontend Safe** fields - Can be configured in UI
   - 🔴 **Backend Only** fields - Must be on backend server
3. Configure integrations as needed

### Step 8: Test Integrations

For enabled integrations:
- Green checkmark: Connected and working
- Yellow warning: Credentials not configured
- Red X: Check credentials, permissions, or backend connection

If backend required:
- Ensure backend server is running
- Verify `VITE_BACKEND_URL` is set correctly
- Check backend logs for errors

### Step 9: Test Strategic Queries

Go to **Chat** and try these queries:

**Company-Specific:**
- "What should I focus on today?" (uses active company context)
- "What are the biggest opportunities for [Company Name]?"
- "What conflicts or risks should I be aware of?"

**Cross-Company:**
- Switch companies via Company Selector
- Ask same questions for different companies
- Compare strategic recommendations

**Multi-Dimensional Reasoning:**
- "Should I hire 10 more engineers?"
- "Should we expand to new markets?"
- Listen for second-order and third-order effects analysis

### Step 10: Verify Privacy (If Using Local LLM)

1. Open browser console (F12)
2. Ask any strategic question
3. Check for these indicators:
   ```
   🔒 Using LOCAL LLM (privacy mode)
   🧠 Generating response with LOCAL LLM (Ollama)...
   📍 Model: llama3.1:8b
   🔒 Privacy: All data processed locally, NEVER sent to cloud
   ✅ Local LLM response generated in XXXXms
   🔒 Privacy: No data left your computer
   ```

**If you see warnings about cloud API**, go to Settings → Local LLM → Enable Local LLM

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

### Step 3: Deploy Both with Docker (Alternative)

**Backend Dockerfile:**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

**Frontend Dockerfile:**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

**Docker Compose:**

```yaml
version: '3.8'
services:
  backend:
    build: ./strategic-advisor-backend
    ports:
      - "3001:3001"
    env_file:
      - ./strategic-advisor-backend/.env
    
  frontend:
    build: ./strategic-coworker-app
    ports:
      - "5173:5173"
    environment:
      - VITE_BACKEND_URL=http://backend:3001
    env_file:
      - ./strategic-coworker-app/.env
    depends_on:
      - backend
```

```bash
# Build and run both
docker-compose up -d
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

### "Backend Connection Failed"

**Problem:** Frontend cannot reach backend

**Solution:**
1. Verify backend server is running
2. Check `VITE_BACKEND_URL` is correct
3. Ensure CORS is configured on backend
4. Check firewall/network rules
5. Verify backend health endpoint: `GET /api/health`
6. Check browser console for CORS errors

### "Secrets Exposed Warning"

**Problem:** Security scanner detects secrets in frontend code

**Solution:**
1. Remove ALL secrets from frontend `.env`
2. Move to backend `.env`
3. Update frontend to call backend API
4. Never commit `.env` files
5. Use backend proxy for all API calls
6. Review Settings UI - only enter 🟢 Frontend Safe fields

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

### Frontend
✅ `.env` file is in `.gitignore` (never commit!)  
✅ Only `VITE_*` frontend-safe variables in frontend `.env`  
✅ No secrets (Client Secrets, Tokens) in frontend code  
✅ OAuth redirect URIs use HTTPS in production  
✅ Settings UI used only for 🟢 Frontend Safe fields  

### Backend
✅ Backend server deployed and secured  
✅ All secrets stored in backend `.env` or secrets manager  
✅ Service account keys never exposed to frontend  
✅ API proxy endpoints implemented  
✅ CORS configured to allow only your frontend domain  
✅ Rate limiting enabled on API endpoints  
✅ Backend authentication/authorization implemented  

### General
✅ API keys rotated every 90 days  
✅ Minimum required permissions granted  
✅ Audit logs enabled on integrated platforms  
✅ Employee notification provided (for org-wide scanning)  
✅ Data retention policy documented  
✅ Compliance review completed (GDPR, SOC2, etc.)  
✅ Security scanning enabled in CI/CD pipeline  

---

## Quick Start Paths

### Path 1: Privacy-First (Recommended - 30 minutes)

Perfect for production use with sensitive data:

1. ✅ Install Ollama: https://ollama.com/download
2. ✅ Run: `ollama pull llama3.1:8b`
3. ✅ Start app: `npm run dev`
4. ✅ Settings → Local LLM → Enable Local LLM
5. ✅ Settings → Companies → Verify your 3 companies
6. ✅ Click Daily Briefing - all processing is local!
7. ✅ Ask strategic questions - 100% private

**Result:** Fully functional Strategic Advisor with complete privacy.

### Path 2: Cloud API (Quick Test - 15 minutes)

For demos and testing only:

1. ✅ Get Anthropic API key
2. ✅ Add to `.env`: `VITE_ANTHROPIC_API_KEY=sk-ant-...`
3. ✅ Start app: `npm run dev`
4. ✅ Click Daily Briefing - uses cloud
5. ⚠️ Warning: Company data sent to Anthropic

**Result:** Fast setup but less privacy.

### Path 3: Full Enterprise (4-8 hours)

For organization-wide scanning:

1. ✅ Install Ollama (privacy)
2. ✅ Configure companies
3. ✅ Set up backend server (for integrations)
4. ✅ Configure Microsoft 365/Gmail admin permissions
5. ✅ Enable org-wide scanning
6. ✅ Deploy to production

**Result:** Complete enterprise solution with max privacy and full features.

## Next Steps After Setup

### First Week:
1. ✅ Use daily briefings every morning
2. ✅ Configure your company goals and metrics
3. ✅ Add historical decisions as you make them
4. ✅ Test cross-company switching
5. ✅ Verify privacy mode is active

### First Month:
6. ✅ Add more companies if needed
7. ✅ Connect real integrations (Email, Teams)
8. ✅ Fine-tune AI settings per company
9. ✅ Build habit of strategic queries
10. ✅ Review and update company goals

### Ongoing:
11. ✅ Export company data regularly (backup)
12. ✅ Update Ollama models monthly
13. ✅ Add historical decisions for learning
14. ✅ Monitor system performance
15. ✅ Customize prompts if needed (`src/prompts/agi-strategic-prompt.ts`)

---

**Questions?** Review the documentation or open an issue on GitHub.

**Ready to scale?** See `ORGANIZATION-WIDE-SCANNING.md` for enterprise deployment.
