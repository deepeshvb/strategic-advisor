# Backend Setup Guide for Strategic Advisor

## Why Backend is Required

**Security Critical:** Most integrations require a backend server because:

1. **Client Secrets** - OAuth client secrets cannot be exposed in browser code
2. **Bot Tokens** - Slack/Discord bot tokens grant full access to your workspaces
3. **Service Accounts** - Google/Microsoft service accounts need server-side authentication
4. **API Tokens** - Personal access tokens for GitHub/Jira must be protected

**❌ Never Store These in Frontend:**
- OAuth Client Secrets
- Bot Tokens (Slack, Discord)
- Service Account Keys (JSON files)
- Personal Access Tokens
- API Tokens
- Signing Secrets

**✅ Safe for Frontend:**
- Client IDs (public identifiers)
- Redirect URIs
- Tenant IDs
- Domain names

---

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   Browser   │────────▶│   Backend    │────────▶│  External APIs  │
│  (React UI) │         │   (Node.js)  │         │ (Gmail, Slack,  │
│             │◀────────│              │◀────────│  Teams, etc.)   │
└─────────────┘         └──────────────┘         └─────────────────┘
 - Client IDs           - Secrets stored          - Real credentials
 - Redirect URIs        - Proxy endpoints         - Full API access
 - Public config        - Token exchange          - Org-wide scanning
```

---

## Quick Start Backend (Node.js + Express)

### 1. Create Backend Directory

```bash
mkdir strategic-advisor-backend
cd strategic-advisor-backend
npm init -y
```

### 2. Install Dependencies

```bash
npm install express cors dotenv
npm install @microsoft/microsoft-graph-client @slack/web-api @anthropic-ai/sdk
npm install --save-dev typescript @types/express @types/node ts-node
```

### 3. Create Backend `.env`

```env
# NEVER commit this file!

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-api03-your_key_here

# Gmail (Service Account for org-wide)
GOOGLE_SERVICE_ACCOUNT_KEY=./service-account-key.json
GOOGLE_DOMAIN=yourcompany.com

# Microsoft 365 (Application permissions)
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_TENANT_ID=your_tenant_id

# Slack (Bot Token)
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_CLIENT_SECRET=your_client_secret

# Discord (Bot)
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_SECRET=your_client_secret

# Jira
JIRA_DOMAIN=company.atlassian.net
JIRA_EMAIL=your@email.com
JIRA_API_TOKEN=your_jira_token

# GitHub
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token
GITHUB_CLIENT_SECRET=your_github_secret

# Server Config
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### 4. Create `server.ts`

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - Allow frontend to call backend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Strategic Advisor Backend' });
});

// ===== Gmail API Proxy =====
app.get('/api/gmail/messages', async (req, res) => {
  try {
    // Use service account to fetch all organization emails
    // Implementation with Google APIs
    res.json({ messages: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Gmail' });
  }
});

// ===== Microsoft Graph API Proxy =====
app.get('/api/microsoft/messages', async (req, res) => {
  try {
    // Use application permissions to scan all mailboxes
    // Implementation with Microsoft Graph SDK
    res.json({ messages: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Microsoft' });
  }
});

app.get('/api/microsoft/teams', async (req, res) => {
  try {
    // Fetch all Teams messages
    res.json({ messages: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Teams' });
  }
});

// ===== Slack API Proxy =====
app.get('/api/slack/messages', async (req, res) => {
  try {
    // Use bot token to read all channels
    const { WebClient } = require('@slack/web-api');
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Fetch conversations, messages, etc.
    res.json({ messages: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Slack' });
  }
});

// ===== Discord API Proxy =====
app.get('/api/discord/messages', async (req, res) => {
  try {
    // Use bot token to fetch messages
    res.json({ messages: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Discord' });
  }
});

// ===== Jira API Proxy =====
app.get('/api/jira/issues', async (req, res) => {
  try {
    // Use API token to fetch issues
    const auth = Buffer.from(
      `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
    ).toString('base64');
    
    // Fetch from Jira REST API
    res.json({ issues: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Jira' });
  }
});

// ===== GitHub API Proxy =====
app.get('/api/github/notifications', async (req, res) => {
  try {
    // Use personal access token
    res.json({ notifications: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch GitHub' });
  }
});

// ===== Claude AI Proxy =====
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { query, context } = req.body;
    
    // Call Claude API with secret key from backend
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: query }]
    });
    
    res.json({ response: response.content[0].text });
  } catch (error) {
    res.status(500).json({ error: 'AI analysis failed' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`📡 Accepting requests from: ${process.env.FRONTEND_URL}`);
});
```

### 5. Add Scripts to `package.json`

```json
{
  "scripts": {
    "dev": "ts-node server.ts",
    "start": "node dist/server.js",
    "build": "tsc"
  }
}
```

### 6. Start Backend

```bash
npm run dev
```

Backend now running on `http://localhost:3001`

---

## Update Frontend to Use Backend

### Update `src/services/apiClient.ts` (Create New)

```typescript
const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export async function fetchFromBackend(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.statusText}`);
  }

  return response.json();
}

// Integration-specific functions
export const backendAPI = {
  gmail: {
    fetchMessages: () => fetchFromBackend('/api/gmail/messages'),
  },
  microsoft: {
    fetchMessages: () => fetchFromBackend('/api/microsoft/messages'),
    fetchTeams: () => fetchFromBackend('/api/microsoft/teams'),
  },
  slack: {
    fetchMessages: () => fetchFromBackend('/api/slack/messages'),
  },
  discord: {
    fetchMessages: () => fetchFromBackend('/api/discord/messages'),
  },
  jira: {
    fetchIssues: () => fetchFromBackend('/api/jira/issues'),
  },
  github: {
    fetchNotifications: () => fetchFromBackend('/api/github/notifications'),
  },
  ai: {
    analyze: (query: string, context: any) => 
      fetchFromBackend('/api/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({ query, context }),
      }),
  },
};
```

### Update Frontend `.env`

```env
# Frontend only needs backend URL and public IDs
VITE_BACKEND_URL=http://localhost:3001
VITE_GMAIL_CLIENT_ID=your_client_id
VITE_MICROSOFT_CLIENT_ID=your_client_id
VITE_SLACK_CLIENT_ID=your_client_id
```

---

## Production Deployment

### Option 1: Separate Services (Recommended)

**Frontend:** Deploy to Vercel/Netlify  
**Backend:** Deploy to Railway/Render/Heroku/AWS

```bash
# Frontend (Vercel)
vercel --prod

# Backend (Railway)
railway up
```

### Option 2: Single Server

Deploy both frontend (static files) and backend API on same server:

```nginx
# nginx.conf
server {
  listen 80;
  
  # Serve frontend static files
  location / {
    root /var/www/strategic-advisor;
    try_files $uri /index.html;
  }
  
  # Proxy API calls to backend
  location /api/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

---

## Security Best Practices

### 1. Environment Variables

```bash
# NEVER commit these files
echo ".env" >> .gitignore
echo "service-account-key.json" >> .gitignore
```

### 2. Use Secrets Manager (Production)

Instead of `.env` files, use:
- **AWS Secrets Manager**
- **Azure Key Vault**
- **Google Secret Manager**
- **HashiCorp Vault**

### 3. API Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 4. Authentication

Add authentication to backend endpoints:

```typescript
// JWT authentication middleware
import jwt from 'jsonwebtoken';

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.sendStatus(401);
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Protect routes
app.get('/api/gmail/messages', authenticateToken, async (req, res) => {
  // Only authenticated users can access
});
```

### 5. HTTPS Only (Production)

```typescript
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

---

## Testing Backend

### 1. Test Health Endpoint

```bash
curl http://localhost:3001/api/health
```

### 2. Test Integration Endpoints

```bash
# Gmail
curl http://localhost:3001/api/gmail/messages

# Slack
curl http://localhost:3001/api/slack/messages

# AI Analysis
curl -X POST http://localhost:3001/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"query": "What are my priorities?", "context": {}}'
```

---

## Troubleshooting

### "CORS Error"
- Ensure `FRONTEND_URL` is set correctly in backend `.env`
- Check CORS middleware configuration
- Verify frontend is making requests to correct backend URL

### "API Key Invalid"
- Confirm environment variables are loaded (`dotenv.config()`)
- Check for typos in `.env` file
- Restart backend after changing `.env`

### "Module Not Found"
- Run `npm install` in backend directory
- Check all dependencies are in `package.json`

---

## Next Steps

1. ✅ Set up backend server
2. ✅ Configure environment variables
3. ✅ Test each integration endpoint
4. ✅ Update frontend to use backend API
5. ✅ Deploy backend to production
6. ✅ Configure secrets in production environment
7. ✅ Test end-to-end with real data

**Complete implementation examples:** See `/backend-examples/` folder (create if needed)
