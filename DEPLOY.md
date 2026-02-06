# 🚀 Deployment Guide - Strategic Advisor

## Quick Launch (Local Development)

**For immediate use on your computer:**

### Option 1: Double-Click (Easiest)
1. Open File Explorer
2. Go to: `C:\Users\deepe\strategic-coworker-app`
3. Double-click: `JUST-RUN-IT.bat`
4. Browser opens at http://localhost:5173
5. Done!

### Option 2: Command Line
```powershell
cd C:\Users\deepe\strategic-coworker-app
npm run dev
```

**This is perfect for daily use!** The app runs on your computer with 100% privacy.

---

## Production Deployment Options

Choose based on your needs:

### Option A: Deploy to Cloud (Public Access)
### Option B: Deploy on Company Server (Private Network)
### Option C: Desktop App (Standalone)

---

## Option A: Deploy to Cloud (Vercel/Netlify)

**Best for:** Remote access, team use, demo purposes

### Prerequisites
- Git repository (✅ you have this)
- Account on Vercel or Netlify (free tier available)

### Deploy to Vercel (Recommended - 5 minutes)

#### Step 1: Install Vercel CLI
```powershell
npm install -g vercel
```

#### Step 2: Login
```powershell
vercel login
```

#### Step 3: Deploy
```powershell
cd C:\Users\deepe\strategic-coworker-app
vercel
```

Follow prompts:
- Set up and deploy? **Y**
- Which scope? **Your account**
- Link to existing project? **N**
- Project name? **strategic-advisor**
- Directory? **./** (press Enter)
- Build command? **npm run build** (press Enter)
- Output directory? **dist** (press Enter)

#### Step 4: Set Environment Variables (Optional)
```powershell
vercel env add VITE_ANTHROPIC_API_KEY
# Paste your API key if using cloud API
```

#### Step 5: Deploy Production
```powershell
vercel --prod
```

**Your app is live!** Vercel will give you a URL like:
- https://strategic-advisor.vercel.app

### Deploy to Netlify (Alternative)

#### Via Netlify CLI:
```powershell
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

#### Via Netlify Website (Easier):
1. Go to: https://app.netlify.com
2. Click **"Add new site"** → **"Import from Git"**
3. Connect your GitHub repo: `strategic-advisor`
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **"Deploy site"**

Your site will be live at: `https://your-site-name.netlify.app`

---

## Option B: Deploy on Company Server

**Best for:** Internal use, maximum privacy, compliance requirements

### Prerequisites
- Windows/Linux server
- Node.js 18+ installed
- Access to server (RDP/SSH)

### Method 1: Run with PM2 (Process Manager)

#### On Your Server:

```powershell
# Install PM2 globally
npm install -g pm2

# Clone or copy your project
cd C:\inetpub\wwwroot
git clone https://github.com/deepeshvb/strategic-advisor.git
cd strategic-advisor

# Install dependencies
npm install

# Build for production
npm run build

# Install serve to host the built files
npm install -g serve

# Start with PM2
pm2 start "serve -s dist -l 3000" --name strategic-advisor

# Make it start on system boot
pm2 startup
pm2 save
```

**Access at:** http://your-server-ip:3000

#### Configure IIS (Optional - for Windows Server)

1. Open IIS Manager
2. Add new site:
   - Site name: Strategic Advisor
   - Physical path: `C:\inetpub\wwwroot\strategic-advisor\dist`
   - Binding: Port 80 or 443 (HTTPS)
3. Install URL Rewrite module
4. Add web.config for SPA routing

### Method 2: Docker Container

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
```

Deploy:
```powershell
# Build image
docker build -t strategic-advisor .

# Run container
docker run -d -p 3000:3000 --name strategic-advisor strategic-advisor

# Or with docker-compose
docker-compose up -d
```

---

## Option C: Desktop App (Electron)

**Best for:** Standalone installation, offline use, maximum privacy

### Convert to Desktop App

#### Step 1: Install Electron Builder
```powershell
npm install --save-dev electron electron-builder
```

#### Step 2: Create electron/main.js
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../public/icon.png')
  });

  win.loadFile('dist/index.html');
}

app.whenReady().then(createWindow);
```

#### Step 3: Update package.json
```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "electron .",
    "electron:build": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.strivio.strategic-advisor",
    "productName": "Strategic Advisor",
    "win": {
      "target": ["nsis"],
      "icon": "public/icon.ico"
    }
  }
}
```

#### Step 4: Build Desktop App
```powershell
npm run build
npm run electron:build
```

This creates an installer in `dist/` folder!

---

## Security Checklist for Production

### Before Deploying:

- [ ] Remove or secure `.env` file
- [ ] Enable HTTPS (SSL certificate)
- [ ] Set up authentication (if multi-user)
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Set up monitoring (error tracking)
- [ ] Configure backups (company data)
- [ ] Review firewall rules
- [ ] Test on production-like environment

### For Local LLM (Ollama):
- [ ] Ollama installed on deployment server
- [ ] Models downloaded
- [ ] Ollama accessible to app (same machine or network)
- [ ] Privacy mode enabled by default

### For Cloud API:
- [ ] API keys stored as environment variables
- [ ] Never commit API keys to git
- [ ] Rotate keys regularly
- [ ] Monitor usage and costs
- [ ] Set up usage alerts

---

## Recommended Deployment Strategy

### For Your Use Case (CEO managing 3 companies):

**Best Option:** Local Development + Cloud Backup

1. **Primary:** Run locally on your work computer
   - `npm run dev` or `JUST-RUN-IT.bat`
   - 100% private with Ollama
   - Fast and secure
   - No deployment needed

2. **Backup:** Deploy to Vercel for remote access
   - When traveling or on different devices
   - Use local LLM even on cloud (Ollama can be installed on server)
   - Or use cloud API with encrypted data

3. **Team Use (Future):** Deploy on company server
   - Full privacy and control
   - Organization-wide email/Teams scanning
   - Compliance-friendly
   - Behind company firewall

---

## Quick Deploy Commands

### Vercel (Public Cloud):
```powershell
npm install -g vercel
vercel login
vercel --prod
```

### Company Server:
```powershell
git clone <repo>
npm install
npm run build
pm2 start "serve -s dist -l 3000" --name strategic-advisor
```

### Desktop App:
```powershell
npm run build
npm run electron:build
```

### Local Development (Recommended for now):
```powershell
npm run dev
```

---

## Support & Monitoring

### After Deployment:

1. **Monitor logs:**
   ```powershell
   # PM2
   pm2 logs strategic-advisor
   
   # Vercel
   vercel logs
   ```

2. **Check status:**
   ```powershell
   # PM2
   pm2 status
   
   # Docker
   docker ps
   ```

3. **Update app:**
   ```powershell
   git pull
   npm install
   npm run build
   pm2 restart strategic-advisor
   ```

---

## Cost Comparison

| Deployment | Setup Time | Monthly Cost | Privacy | Complexity |
|-----------|------------|--------------|---------|------------|
| **Local (npm run dev)** | 0 min | $0 | 🟢 100% | 🟢 Easy |
| Vercel Free Tier | 5 min | $0 | 🟡 Cloud | 🟢 Easy |
| Vercel Pro | 5 min | $20 | 🟡 Cloud | 🟢 Easy |
| Company Server | 30 min | $50-200 | 🟢 100% | 🟡 Medium |
| Desktop App | 1 hour | $0 | 🟢 100% | 🔴 Hard |

---

## 🎯 What I Recommend for You

**Right Now:**

Just keep using local development:
```powershell
npm run dev
```

**Why:**
- ✅ Instant access
- ✅ 100% private with Ollama
- ✅ $0 cost
- ✅ All features work
- ✅ Easy to update
- ✅ No deployment complexity

**Later (when needed):**
- Deploy to company server for team access
- Or create desktop app for portable use

---

**Need help with any specific deployment option? Let me know!**
