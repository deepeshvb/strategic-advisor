# 🚀 Strategic Advisor - Launch Checklist

Use this checklist to verify your Strategic Advisor is fully functional and ready for daily use.

---

## ✅ Pre-Launch Verification

### 1. Files & Dependencies
- [ ] All source files present (run `git status`)
- [ ] `npm install` completed without errors
- [ ] `npm run build` passes without TypeScript errors
- [ ] Node modules directory exists (~500MB)

### 2. Environment Setup
- [ ] `.env` file exists (or skip for local LLM only)
- [ ] `.gitignore` includes `.env` (to protect API keys)
- [ ] Port 5173 is available (default Vite port)

---

## 🔒 Privacy Mode Setup (Recommended)

### 3. Ollama Installation
- [ ] Ollama installed and accessible
- [ ] `curl http://localhost:11434` returns "Ollama is running"
- [ ] At least one model downloaded (`ollama list` shows models)
- [ ] Model size appropriate for your RAM:
  - [ ] 48GB+ RAM → llama3.1:70b (best quality)
  - [ ] 16GB+ RAM → llama3.1:8b (recommended)
  - [ ] 8GB RAM → mistral:7b (good balance)
  - [ ] 4GB RAM → phi3:3.8b (minimum)

**If Ollama not installed:**
```bash
# Windows: Download from https://ollama.com/download
# macOS: brew install ollama
# Linux: curl -fsSL https://ollama.com/install.sh | sh

# Then download model:
ollama pull llama3.1:8b
```

---

## 🎯 Application Launch

### 4. Start Application

**Windows:**
```bash
START.bat
```

**macOS/Linux:**
```bash
chmod +x start.sh
./start.sh
```

**Manual:**
```bash
npm run dev
```

### 5. Browser Opens
- [ ] Browser opens automatically to http://localhost:5173
- [ ] If not, manually open: http://localhost:5173
- [ ] App loads without console errors (F12 to check)

---

## 🏢 Company Configuration Verification

### 6. Company Selector (Sidebar)
- [ ] "Company Selector" section visible in sidebar
- [ ] Shows active company name (e.g., "Othain Group")
- [ ] Industry and stage shown below name
- [ ] Click dropdown → shows all 3 companies:
  - [ ] Othain Group
  - [ ] Jersey Technology Partners
  - [ ] Strivio LLC
- [ ] "X companies" indicator shows "3 companies"
- [ ] "Add New Company" button at bottom of dropdown
- [ ] Can switch companies (click different one)
- [ ] Page context changes when switching

### 7. Company Management (Settings)
Go to **Settings** → **Companies** tab:

- [ ] All 3 companies displayed in grid
- [ ] Each company card shows:
  - [ ] Company name and industry
  - [ ] Stage (Established, Growth, Startup)
  - [ ] Number of employees (if applicable)
  - [ ] Description
  - [ ] Current goals (first 3)
  - [ ] "Active" badge on current company
- [ ] "Add Company" button in top right
- [ ] Can click "Set Active" on non-active companies
- [ ] Can click "Edit" to modify company details
- [ ] Can click "Delete" (shows confirmation)
- [ ] Edit form modal opens properly
- [ ] All form fields editable
- [ ] Save/Cancel buttons work
- [ ] Privacy notice shown at bottom (green box)

---

## 🔐 Local LLM Configuration

### 8. Local LLM Settings
Go to **Settings** → **Local LLM** tab:

- [ ] Tab exists and loads
- [ ] "Check Status" button present
- [ ] Click "Check Status" → shows:
  - [ ] ✓ "Ollama is Running" (if installed)
  - [ ] List of installed models
  - [ ] OR error message if not running
- [ ] Model dropdown populated with available models
- [ ] Can select a model from dropdown
- [ ] Base URL field shows `http://localhost:11434`
- [ ] "Privacy Mode" toggle switch present
- [ ] "Enable Local LLM" button works
- [ ] Status indicator updates when enabled
- [ ] Setup instructions visible
- [ ] Recommended models listed

**If Ollama Not Running:**
- [ ] Error message is clear
- [ ] Instructions provided for installation
- [ ] Can still use app (falls back to cloud if configured)

---

## 💬 Chat Interface Verification

### 9. Chat Functionality
Go to **Chat** (should be default view):

- [ ] Chat interface visible
- [ ] Input box at bottom
- [ ] Can type messages
- [ ] "Send" button (paper plane icon) works
- [ ] Can send with Enter key
- [ ] Messages appear in chat history
- [ ] Timestamps shown on messages
- [ ] User messages right-aligned (blue/gray)
- [ ] AI responses left-aligned (white background)

### 10. AI Response Quality
Send test query: "What should I focus on today?"

**If Local LLM Enabled:**
- [ ] Check browser console (F12):
  - [ ] `🔒 Using LOCAL LLM (privacy mode)` logged
  - [ ] `🧠 Generating response with LOCAL LLM (Ollama)...` logged
  - [ ] `📍 Model: [your-model-name]` logged
  - [ ] `🔒 Privacy: All data processed locally` logged
  - [ ] `✅ Local LLM response generated in XXXXms` logged
- [ ] Response mentions active company by name
- [ ] Response references company goals or context
- [ ] Response is conversational and strategic (not generic)
- [ ] Markdown formatted (headings, lists, bold)

**If Cloud API Used:**
- [ ] Console shows: `☁️ Using cloud API (Ollama not available)`
- [ ] Privacy warning in console
- [ ] Response still relevant but generic

### 11. Daily Briefing
- [ ] "Daily Briefing" button visible
- [ ] Click button → AI generates briefing
- [ ] Briefing includes:
  - [ ] Company-specific context
  - [ ] Strategic priorities
  - [ ] Insights or recommendations
  - [ ] Formatted with markdown headings
- [ ] Takes 2-10 seconds (local) or 1-2 seconds (cloud)

### 12. Voice Features
- [ ] Microphone icon visible (right side of input)
- [ ] Click microphone → browser asks for permission
- [ ] Grant permission
- [ ] Speak → text appears in input box
- [ ] Voice input stops when you stop speaking
- [ ] Click microphone again to stop
- [ ] Speaker icon visible on messages
- [ ] Click speaker → text-to-speech reads message
- [ ] Voice stops when:
  - [ ] You send a new message
  - [ ] You refresh page
  - [ ] You click speaker again

### 13. Markdown Rendering
Send message with formatting: "Give me a strategic **plan** with:\n\n# Heading\n\n- Item 1\n- Item 2"

- [ ] Bold text (**plan**) renders bold
- [ ] Heading renders as large text
- [ ] Bullet points render as list
- [ ] Line breaks preserved
- [ ] Code blocks render (if used)

---

## 📊 Dashboard Verification

### 14. Dashboard View
Click **Dashboard** in sidebar:

- [ ] Dashboard loads
- [ ] Shows insights cards
- [ ] Shows priorities/tasks
- [ ] Shows quick stats
- [ ] Integration status widget visible
- [ ] Colors are green theme
- [ ] All sections responsive

---

## ⚙️ Settings Verification

### 15. Settings Tabs
Click **Settings** in sidebar:

- [ ] Settings view loads
- [ ] Three tabs visible:
  - [ ] Companies
  - [ ] Local LLM
  - [ ] Integrations
- [ ] Tab switching works
- [ ] Each tab loads content

### 16. Integration Settings
Go to **Settings** → **Integrations** tab:

- [ ] All integrations listed:
  - [ ] Gmail
  - [ ] Microsoft 365 (Teams, Outlook)
  - [ ] Slack
  - [ ] Discord
  - [ ] Jira
  - [ ] GitHub
- [ ] Security badges visible:
  - [ ] 🟢 "Frontend Safe" for OAuth/public fields
  - [ ] 🔴 "Backend Only" for sensitive keys
  - [ ] 🔴 "Backend Required" for org-wide scanning
- [ ] Toggle switches to enable/disable
- [ ] Input fields for configuration
- [ ] "Generate .env" button works
- [ ] "Security Information" section present
- [ ] Setup instructions clear

---

## 🎯 Advanced Feature Testing

### 17. Multi-Company Context Switching
- [ ] Go to Chat
- [ ] Note active company in sidebar
- [ ] Ask: "What are my current goals?"
- [ ] Response mentions current company's goals
- [ ] Switch company in Company Selector
- [ ] Ask again: "What are my current goals?"
- [ ] Response mentions NEW company's goals (different from before)
- [ ] Context successfully switched

### 18. Strategic Reasoning
Ask complex question: "Should I hire 10 more engineers?"

- [ ] Response considers multiple dimensions:
  - [ ] Immediate impact
  - [ ] Second-order effects
  - [ ] Third-order implications
  - [ ] Opportunity cost
  - [ ] Risks and upsides
- [ ] Response references company-specific context
- [ ] Response is conversational, not robotic
- [ ] Provides actionable guidance

### 19. Cross-Company Queries
- [ ] Switch to first company
- [ ] Ask about strategy/challenges
- [ ] Switch to second company
- [ ] Ask similar questions
- [ ] Responses are different and company-specific
- [ ] Can compare insights mentally or ask: "What's working at Company A?"

---

## 🐛 Error Handling & Edge Cases

### 20. Ollama Issues (If Using Local LLM)
- [ ] Stop Ollama (simulate failure)
- [ ] Try to send chat message
- [ ] Error message is clear and helpful
- [ ] Suggests checking Ollama status
- [ ] Provides setup instructions
- [ ] App doesn't crash

### 21. Network Issues
- [ ] Disconnect internet (if using cloud API)
- [ ] Try to send message
- [ ] Error message is clear
- [ ] App remains functional
- [ ] Can still browse settings, companies, etc.

### 22. Long Responses
- [ ] Ask complex question requiring long answer
- [ ] Response loads (may take 5-30s depending on model)
- [ ] Entire response displays
- [ ] Markdown renders properly throughout
- [ ] Scroll works in chat
- [ ] No truncation or errors

### 23. Empty State Handling
- [ ] Clear all companies (Settings → Companies → Delete all)
- [ ] Company Selector shows warning message
- [ ] Chat still accessible
- [ ] Can add companies back
- [ ] App doesn't crash

---

## ✅ Final Production Readiness

### 24. Performance
- [ ] App loads in <3 seconds
- [ ] Chat responses in 1-10s (depending on local vs cloud)
- [ ] UI is responsive (no lag when clicking)
- [ ] Switching companies is instant
- [ ] No memory leaks (check Task Manager after 30 min use)

### 25. Browser Compatibility
Test in multiple browsers:
- [ ] Chrome/Edge - Works
- [ ] Firefox - Works
- [ ] Safari - Works (macOS)

### 26. Mobile Responsive (Bonus)
Open on mobile device or resize browser:
- [ ] Layout adapts to smaller screen
- [ ] Sidebar becomes collapsible
- [ ] Chat remains usable
- [ ] Settings accessible

### 27. Data Persistence
- [ ] Add a new company
- [ ] Refresh page (Ctrl+R)
- [ ] New company still there
- [ ] Active company remembered
- [ ] Local LLM settings remembered
- [ ] Chat history persists (if implemented)

### 28. Privacy Verification (Critical for Production)
**With Local LLM Enabled:**
- [ ] Open browser DevTools (F12)
- [ ] Go to Network tab
- [ ] Send 5 chat messages
- [ ] Check network requests:
  - [ ] Only `localhost:11434` requests (Ollama)
  - [ ] NO requests to `api.anthropic.com`
  - [ ] NO requests to external domains (except if you configured news APIs)
- [ ] Console shows privacy confirmations
- [ ] Status indicator shows "Privacy Mode Active"

**This confirms 100% private operation - your data stays on your machine!**

---

## 🎉 Launch Complete!

### If All Checks Pass:

**🎊 Congratulations! Your Strategic Advisor is fully operational!**

You now have:
- ✅ 100% private AI with local LLM
- ✅ 3 companies pre-configured
- ✅ Multi-company context switching
- ✅ Strategic AGI reasoning
- ✅ Daily briefings
- ✅ Voice input/output
- ✅ Beautiful markdown responses
- ✅ $0/month ongoing costs

### Next Steps:

1. **Daily Workflow:**
   - Morning: Click "Daily Briefing" for each company
   - Throughout day: Ask strategic questions
   - Evening: Review decisions and priorities

2. **Customize:**
   - Edit company goals (Settings → Companies)
   - Add more companies as needed
   - Fine-tune AI settings

3. **Advanced:**
   - Set up backend for email scanning (see BACKEND-SETUP-GUIDE.md)
   - Enable external data sources (news, market data)
   - Add historical decisions for learning

4. **Optimize:**
   - Try different models (llama3.1:70b if you have RAM)
   - Adjust temperature/max tokens (Settings → Local LLM)
   - Export company data for backup

---

## 🆘 If Checks Fail:

### Common Issues:

**❌ Ollama not running**
→ See [OLLAMA-SETUP.md](OLLAMA-SETUP.md)

**❌ Companies not showing**
→ Clear localStorage, reload page

**❌ Responses too slow**
→ Use smaller model (mistral:7b or phi3:3.8b)

**❌ TypeScript errors**
→ `rm -rf node_modules && npm install`

**❌ Port conflict**
→ Change port in `vite.config.ts` or kill process on 5173

**Full troubleshooting:** See [LAUNCH-GUIDE.md](LAUNCH-GUIDE.md#troubleshooting)

---

## 📊 Benchmark Your Setup

After launch, measure performance:

### Local LLM Speed Test
Ask: "Give me a one-sentence summary of opportunities for [Your Company]"

| Model | Expected Time | Your Time | Status |
|-------|--------------|-----------|---------|
| llama3.1:70b | 10-30s | ___s | ⬜ |
| llama3.1:8b | 2-5s | ___s | ⬜ |
| mistral:7b | 1-3s | ___s | ⬜ |
| phi3:3.8b | <1s | ___s | ⬜ |

### Quality Test
Ask: "Should I expand to new markets or consolidate existing ones?"

Expected: Multi-dimensional analysis with second/third-order effects, company-specific context

- [ ] Got multi-dimensional reasoning
- [ ] Got company-specific context
- [ ] Got actionable guidance
- [ ] Response was conversational

---

## ✍️ Sign-Off

**Launched by:** _________________  
**Date:** _________________  
**Local LLM Model:** _________________  
**Active Company:** _________________  
**Privacy Mode:** ☐ Enabled  ☐ Disabled  

**Status:** ☐ All checks passed - Production ready!

---

**🚀 Your Strategic Advisor is ready to help you make better decisions!**

Start with: "What should I focus on today?"
