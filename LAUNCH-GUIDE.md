# 🚀 Launch Guide - Strategic Advisor

Complete guide to launch your Strategic Advisor dashboard with all features.

---

## ✅ Pre-Launch Checklist

### 1. **Verify All Files Are Present**

Check these critical files exist:

```bash
# Core App
src/App.tsx
src/components/ChatInterface.tsx
src/components/Dashboard.tsx
src/components/SettingsView.tsx

# Multi-Company Features
src/components/CompanySelector.tsx
src/components/CompanyManagement.tsx
src/data/initialCompanies.ts
src/services/companyService.ts
src/types/company.ts

# Local LLM (Privacy)
src/components/LocalLLMSettings.tsx
src/services/localLLMService.ts
src/prompts/agi-strategic-prompt.ts

# Integrations
src/components/IntegrationSettings.tsx
src/components/IntegrationStatus.tsx
src/services/integrationService.ts
src/services/realDataService.ts

# Other Services
src/services/ceoAIService.ts
src/services/syntheticData.ts
src/services/externalDataService.ts
```

### 2. **Install Dependencies**

```bash
# Install all npm packages
npm install

# This installs:
# - React & Vite
# - TypeScript
# - Tailwind CSS
# - Lucide Icons
# - Anthropic SDK (optional, for cloud API)
# - React Markdown & remark-gfm
```

### 3. **Configure Environment (Optional)**

If using Cloud API (NOT recommended for production):

```bash
# Copy example
cp .env.example .env

# Edit .env and add your Anthropic API key
# VITE_ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
```

**⚠️ For Privacy: Skip this step and use Local LLM instead!**

---

## 🚀 Launch Methods

### Method 1: Local LLM (RECOMMENDED - Privacy First)

**Perfect for production use with real company data**

#### Step 1: Install Ollama

**Windows:**
```bash
# Download and run installer
# https://ollama.com/download/windows
```

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

#### Step 2: Start Ollama & Download Model

```bash
# Ollama starts automatically on Windows
# On macOS/Linux, start it:
ollama serve

# In a new terminal, download a model:
# Choose based on your RAM:

# Best Quality (48GB+ RAM)
ollama pull llama3.1:70b

# Good Balance (16GB+ RAM) - RECOMMENDED
ollama pull llama3.1:8b

# Fast & Lightweight (8GB RAM)
ollama pull mistral:7b

# Minimum (4GB RAM)
ollama pull phi3:3.8b
```

#### Step 3: Launch Strategic Advisor

```bash
# Start the app
npm run dev

# App launches at http://localhost:5173
```

#### Step 4: Configure Local LLM

1. Open http://localhost:5173
2. Click **Settings** (bottom of sidebar)
3. Go to **Local LLM** tab
4. Click **Check Status** - should show "Ollama is Running ✓"
5. Select your downloaded model (e.g., `llama3.1:8b`)
6. Click **Enable Local LLM**
7. Status should show "Privacy Mode Active"

#### Step 5: Verify Companies Are Loaded

1. Look at sidebar - you should see **Company Selector**
2. It should show: **Othain Group** (or one of your companies)
3. Click dropdown - all 3 companies listed:
   - Othain Group
   - Jersey Technology Partners
   - Strivio LLC
4. Go to **Settings** → **Companies** - verify all details are there

#### Step 6: Test Strategic Queries

Go to **Chat** and try:
```
What should I focus on today?
What are the biggest opportunities for Othain Group?
What conflicts or risks should I be aware of?
Should I hire 5 more engineers for Jersey Tech?
```

**Expected:** Responses generated entirely on your local machine, using company-specific context.

---

### Method 2: Cloud API (Quick Test Only)

**⚠️ NOT recommended for real company data**

#### Step 1: Get API Key

1. Sign up at https://console.anthropic.com
2. Create API key
3. Copy key starting with `sk-ant-api03-...`

#### Step 2: Configure

```bash
# Edit .env file
VITE_ANTHROPIC_API_KEY=sk-ant-api03-YOUR_ACTUAL_KEY_HERE
```

#### Step 3: Launch

```bash
npm run dev
```

#### Step 4: Use App

- App uses Cloud API by default if Ollama not detected
- ⚠️ All company data sent to Anthropic
- ⚠️ Organization-wide emails/chats transmitted to third party
- Cost: ~$0.01-0.10 per query

---

## 🎯 Feature Verification

### After Launch, Verify These Features:

#### ✅ Multi-Company Management

1. **Company Selector (Sidebar)**
   - [ ] Shows active company
   - [ ] Dropdown lists all 3 companies
   - [ ] Can switch between companies
   - [ ] "Add New Company" button works

2. **Company Management (Settings)**
   - [ ] Settings → Companies tab exists
   - [ ] All 3 companies are listed
   - [ ] Can edit company details
   - [ ] Can add new company
   - [ ] Can delete companies (except active)
   - [ ] Can set active company

3. **Company-Specific Context**
   - [ ] Chat responses reference active company
   - [ ] Switching companies changes context
   - [ ] Goals and competitors mentioned in responses

#### ✅ Local LLM (Privacy Mode)

1. **Settings UI**
   - [ ] Settings → Local LLM tab exists
   - [ ] Shows Ollama status
   - [ ] Lists available models
   - [ ] Can select model
   - [ ] Enable/Disable toggle works

2. **Privacy Verification**
   - [ ] Open browser console (F12)
   - [ ] Send a chat query
   - [ ] Look for: `🔒 Using LOCAL LLM (privacy mode)`
   - [ ] Look for: `🔒 Privacy: All data processed locally`
   - [ ] Should see model name and timing
   - [ ] NO cloud API calls visible in Network tab

3. **Functionality**
   - [ ] Responses are relevant
   - [ ] Company context is included
   - [ ] Strategic reasoning is sophisticated
   - [ ] Response time reasonable (varies by model/hardware)

#### ✅ Chat Interface

1. **Basic Features**
   - [ ] Can type messages
   - [ ] Can send with Enter key
   - [ ] Voice input works (microphone icon)
   - [ ] Voice output works (speaker icon)
   - [ ] Daily Briefing button generates briefing
   - [ ] Markdown renders (headings, bold, lists)

2. **Advanced Features**
   - [ ] Voice stops when new query sent
   - [ ] Integration status shown
   - [ ] Messages show timestamps
   - [ ] Chat history persists
   - [ ] Responses are conversational

#### ✅ Dashboard

1. **Insights Display**
   - [ ] Shows strategic insights
   - [ ] Priorities listed
   - [ ] Quick stats shown
   - [ ] Integration status visible

2. **Data Sources**
   - [ ] Using synthetic data initially (yellow warning)
   - [ ] Status shows which integrations are configured

#### ✅ Settings

1. **Tabbed Interface**
   - [ ] Three tabs: Companies, Local LLM, Integrations
   - [ ] Tab switching works
   - [ ] All tabs render correctly

2. **Integration Settings**
   - [ ] Shows Gmail, Teams, Slack, etc.
   - [ ] Security badges (Frontend Safe / Backend Only)
   - [ ] Can toggle integrations
   - [ ] Generate .env content works

---

## 🐛 Troubleshooting

### Issue: "Ollama is not running"

**Solutions:**
```bash
# Check if Ollama is running
curl http://localhost:11434
# Should return: "Ollama is running"

# If not, start it:
# Windows: Already runs as service, restart it
# macOS/Linux:
ollama serve
```

### Issue: "No models found"

**Solution:**
```bash
# List installed models
ollama list

# If empty, download a model
ollama pull llama3.1:8b

# Refresh the app
```

### Issue: "Companies not showing"

**Solution:**
```bash
# Clear browser storage and reload
# Chrome: F12 → Application → Local Storage → Clear All
# Then reload page (Ctrl+R)

# Companies will auto-initialize from src/data/initialCompanies.ts
```

### Issue: "Port 5173 already in use"

**Solution:**
```bash
# Kill existing process
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:5173 | xargs kill -9

# Or change port in vite.config.ts
```

### Issue: "TypeScript errors"

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Build to verify
npm run build
```

### Issue: "Slow responses from Local LLM"

**Causes & Solutions:**
1. **Large model on limited hardware**
   - Switch to smaller model (mistral:7b or phi3:3.8b)
   - Settings → Local LLM → Select different model

2. **First query is always slower**
   - Model loading takes time initially
   - Subsequent queries are faster

3. **Hardware constraints**
   - 70B model needs 48GB+ RAM
   - 8B model needs 16GB+ RAM
   - Use cloud API for quick testing if hardware limited

### Issue: "Responses not company-specific"

**Verification:**
1. Go to Settings → Companies
2. Verify goals and competitors are filled in
3. Check active company in sidebar
4. In chat, explicitly mention company name in query

---

## 📊 Performance Benchmarks

### Local LLM Response Times (Approximate)

| Model | RAM Required | Speed | Quality | Use Case |
|-------|-------------|-------|---------|----------|
| **llama3.1:70b** | 48GB+ | Slow (10-30s) | Excellent | Maximum quality, high-end machines |
| **llama3.1:8b** | 16GB+ | Fast (2-5s) | Excellent | **Recommended - best balance** |
| **mistral:7b** | 8GB | Very Fast (1-3s) | Good | Lower-end machines, quick queries |
| **phi3:3.8b** | 4GB | Ultra Fast (<1s) | Acceptable | Minimum viable option |

### Cloud API Response Times

- **Average**: 1-2 seconds
- **Cost**: $0.01-0.10 per query
- **Privacy**: ⚠️ Data sent to Anthropic

---

## 🎉 Launch Checklist

Use this to verify successful launch:

### Pre-Launch
- [ ] All files from repo are present
- [ ] `npm install` completed successfully
- [ ] No TypeScript errors (`npm run build` passes)

### Privacy-First Setup (Recommended)
- [ ] Ollama installed and running
- [ ] At least one model downloaded
- [ ] Local LLM enabled in Settings
- [ ] Privacy mode confirmed (console logs)

### Feature Verification
- [ ] All 3 companies show in Company Selector
- [ ] Can switch between companies
- [ ] Chat responses are relevant and strategic
- [ ] Daily Briefing generates properly
- [ ] Voice input/output work
- [ ] Markdown renders in responses
- [ ] Settings tabs all functional

### Production Ready
- [ ] Using Local LLM (not cloud API)
- [ ] Company data configured
- [ ] Integration settings reviewed
- [ ] Backend setup planned (if needed for org-wide scanning)

---

## 🚀 You're Ready!

**The Strategic Advisor is now running!**

### Next Steps:
1. **Daily Briefing**: Click the button every morning for your strategic outlook
2. **Company Switching**: Use the selector to get context for each company
3. **Strategic Queries**: Ask complex questions about priorities, conflicts, opportunities
4. **Voice Control**: Use microphone for hands-free operation
5. **Configure Integrations**: When ready, set up email/Teams scanning (requires backend)

### Recommended Daily Workflow:
```
Morning:
1. Launch app
2. Click "Daily Briefing"
3. Review insights and priorities
4. Switch companies, get briefing for each

Throughout Day:
- Quick queries: "What's urgent?"
- Context switches: Toggle company selector
- Voice notes: Use microphone for quick thoughts

Evening:
- Review decisions made
- Add to historical context (future feature)
- Plan tomorrow's focus
```

---

## 📚 Additional Resources

- **Privacy Setup**: See [OLLAMA-SETUP.md](OLLAMA-SETUP.md)
- **AGI Capabilities**: See [AGI-CAPABILITIES-GUIDE.md](AGI-CAPABILITIES-GUIDE.md)
- **Full Implementation**: See [IMPLEMENTATION-GUIDE.md](IMPLEMENTATION-GUIDE.md)
- **Company Configuration**: See [YOUR-COMPANIES-CONFIGURED.md](YOUR-COMPANIES-CONFIGURED.md)
- **Backend Setup**: See [BACKEND-SETUP-GUIDE.md](BACKEND-SETUP-GUIDE.md)

**Questions? Issues? Check the troubleshooting section above or the full guides.**

---

🎯 **Your Strategic Advisor is ready to help you make better decisions across all your companies!**
