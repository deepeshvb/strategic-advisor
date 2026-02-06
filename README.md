# Strategic Advisor - AGI-Powered Executive Intelligence Platform

> **Your private, AI-powered strategic advisor for managing multiple companies**

100% private with local LLM • Organization-wide intelligence • Multi-company support • AGI reasoning

---

## 🎯 What Is This?

**Strategic Advisor** is an advanced AI platform designed for CEOs and executives managing one or multiple companies. It provides:

- **🔒 100% Private AI** - Runs entirely on your machine with Ollama (local LLM)
- **🏢 Multi-Company Management** - Switch context between your companies instantly
- **🧠 AGI-Level Reasoning** - Sophisticated multi-dimensional strategic analysis
- **📊 Organization-Wide Intelligence** - Scan all emails, Teams, Slack across your org
- **💬 Conversational Interface** - Natural language queries with voice support
- **📈 Strategic Guidance** - Daily briefings, conflict detection, opportunity identification

---

## ⚡ Quick Start

### 1. Install & Launch (5 minutes)

```bash
# Clone the repo
git clone https://github.com/deepeshvb/strategic-advisor.git
cd strategic-advisor

# Install dependencies
npm install

# Launch (Windows)
START.bat

# Launch (macOS/Linux)
chmod +x start.sh
./start.sh
```

### 2. Enable Privacy Mode (Optional but Recommended)

For 100% private AI processing:

```bash
# Install Ollama
# Windows: Download from https://ollama.com/download
# macOS: brew install ollama
# Linux: curl -fsSL https://ollama.com/install.sh | sh

# Download AI model (choose based on your RAM)
ollama pull llama3.1:8b   # 16GB+ RAM (Recommended)
ollama pull mistral:7b    # 8GB RAM
ollama pull phi3:3.8b     # 4GB RAM

# In the app:
# Settings → Local LLM → Enable Local LLM
```

### 3. Configure Your Companies

Your companies are pre-configured! Check Settings → Companies:
- ✅ Othain Group
- ✅ Jersey Technology Partners
- ✅ Strivio LLC

---

## 🚀 Key Features

### 🔒 Privacy-First Architecture

- **Local LLM** - All AI processing on your machine with Ollama
- **No Cloud Dependencies** - Your company data NEVER leaves your computer
- **Local Storage** - Companies, decisions, history stored in browser
- **Optional Cloud Fallback** - Can use Claude API for testing (with warnings)

### 🏢 Multi-Company Management

- **Company Selector** - Switch between companies in sidebar
- **Separate Context** - Each company has its own goals, metrics, competitors
- **Cross-Company Analysis** - Compare performance and strategies
- **Unlimited Companies** - Add as many companies as you manage

### 🧠 AGI-Level Strategic Intelligence

- **Multi-Dimensional Reasoning**
  - Immediate impact analysis
  - Second & third-order effects
  - Opportunity cost assessment
  - Risk/upside scenarios
  
- **Contextual Intelligence**
  - Company-specific goals and metrics
  - Competitor tracking
  - Industry trends
  - Historical decision learning
  
- **Proactive Insights**
  - Daily strategic briefings
  - Conflict detection across teams
  - Opportunity identification
  - Priority recommendations

### 💬 Natural Conversational Interface

- **Voice Input/Output** - Hands-free operation
- **Markdown Rendering** - Beautiful formatted responses
- **Daily Briefings** - Morning strategic outlook
- **Strategic Queries** - Ask complex questions in plain English

### 📊 Organization-Wide Scanning (Coming Soon)

- Email (Gmail, Outlook) across all employees
- Teams/Slack messages organization-wide
- Calendar events and patterns
- GitHub/Jira activity
- Conflict and misalignment detection

---

## 📖 Documentation

- **[LAUNCH-GUIDE.md](LAUNCH-GUIDE.md)** - Complete launch instructions
- **[IMPLEMENTATION-GUIDE.md](IMPLEMENTATION-GUIDE.md)** - Full setup & configuration
- **[OLLAMA-SETUP.md](OLLAMA-SETUP.md)** - Local LLM installation guide
- **[AGI-CAPABILITIES-GUIDE.md](AGI-CAPABILITIES-GUIDE.md)** - AGI features explained
- **[YOUR-COMPANIES-CONFIGURED.md](YOUR-COMPANIES-CONFIGURED.md)** - Company details
- **[BACKEND-SETUP-GUIDE.md](BACKEND-SETUP-GUIDE.md)** - Backend server for integrations

---

## 🎯 Use Cases

### For CEOs Managing Multiple Companies

```
Morning: "What should I focus on today?"
→ Get briefing for each company, prioritize CEO time

Context Switch: Click company selector
→ Instantly switch strategic context

Strategic Query: "Should I hire 10 engineers at Jersey Tech?"
→ Get multi-dimensional analysis with second/third-order effects

Conflict Detection: "What conflicts exist between teams?"
→ Proactive identification of issues before they escalate

Opportunity: "What's the biggest opportunity for Othain Group?"
→ Market trends + competitive analysis + internal capabilities
```

### For Founders Scaling Multiple Ventures

```
Portfolio View: Switch between companies
→ See which company needs attention most

Cross-Company Learning: "What's working at Company A that could help Company B?"
→ Apply lessons across portfolio

Resource Allocation: "Where should I invest next $500K?"
→ Strategic analysis across all companies

Risk Assessment: "What are my biggest risks this quarter?"
→ Aggregate view with mitigation strategies
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐     │
│  │   Chat     │  │  Dashboard   │  │   Settings      │     │
│  │ Interface  │  │   Insights   │  │ Multi-Company   │     │
│  └────────────┘  └──────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    AI PROCESSING LAYER                       │
│                                                               │
│  ┌──────────────────┐           ┌───────────────────┐       │
│  │  Local LLM       │           │   Cloud API       │       │
│  │  (Ollama)        │           │   (Anthropic)     │       │
│  │  🔒 Private      │           │   ⚠️  Cloud       │       │
│  └──────────────────┘           └───────────────────┘       │
│           ↑ Primary                     ↑ Fallback          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA SOURCES                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Companies   │  │ Integrations │  │   External   │      │
│  │  (Local)     │  │ (Backend)    │  │  Market Data │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 💰 Cost Comparison

| Feature | Local LLM (Ollama) | Cloud API (Claude) |
|---------|-------------------|-------------------|
| **Privacy** | 🟢 100% Private | 🔴 Data sent to third party |
| **Cost** | 🟢 $0/month | 🔴 $50-500/month (usage-based) |
| **Speed** | 🟡 2-10s (depends on hardware) | 🟢 1-2s |
| **Offline** | 🟢 Works offline | 🔴 Requires internet |
| **Data Security** | 🟢 Never leaves machine | 🔴 Transmitted to cloud |
| **Setup Time** | 🟡 30 minutes | 🟢 5 minutes |

**Recommendation:** Use Local LLM for production with sensitive company data.

---

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **AI (Local)**: Ollama (Llama 3.1, Mistral, etc.)
- **AI (Cloud)**: Anthropic Claude 3.5 Sonnet (optional)
- **Icons**: Lucide React
- **Markdown**: react-markdown + remark-gfm
- **Voice**: Web Speech API
- **Storage**: localStorage (companies, config)
- **Backend** (optional): Node.js + Express (for org-wide scanning)

---

## 🔐 Security & Privacy

### Data Privacy Layers

1. **Local LLM** - All AI inference on your machine
2. **Local Storage** - All company data in browser localStorage
3. **No External APIs** - (unless you enable integrations)
4. **Optional Backend** - For org-wide scanning only
5. **Explicit Warnings** - When data would go to cloud

### What's NEVER Sent to Cloud (with Local LLM)

✅ Company goals and strategies  
✅ Team communications  
✅ Financial data  
✅ Competitor intelligence  
✅ Historical decisions  
✅ Any queries you make  

### What's Configurable (Your Choice)

- Email integration (requires backend)
- Teams/Slack scanning (requires backend)
- External market data (News APIs, etc.)
- Cloud API fallback (if Ollama unavailable)

---

## 📊 Pre-Configured Companies

Your Strategic Advisor comes with 3 companies pre-configured:

### 1. **Othain Group**
- Digital Transformation & IT Consulting
- ~135 employees, Established
- Focus: SAP/Oracle, QA/Testing, RPA, AI Solutions
- Goals: Expand AI practice, grow testing automation

### 2. **Jersey Technology Partners**
- IT Services & Digital Transformation
- Growth stage
- Focus: Product engineering, AI/ML, Cloud services
- Goals: Scale AI consulting, build strategic partnerships

### 3. **Strivio LLC**
- Executive Services & Business Intelligence
- Startup (This platform!)
- Focus: Strategic advisory platform
- Goals: Launch platform, acquire first 10 clients

**See [YOUR-COMPANIES-CONFIGURED.md](YOUR-COMPANIES-CONFIGURED.md) for full details**

---

## 🤝 Contributing

This is a private strategic tool, but contributions welcome for:
- Bug fixes
- Performance improvements
- New local LLM models
- UI/UX enhancements
- Documentation

---

## 📝 License

Private/Proprietary - © 2026 Strivio LLC

---

## 🆘 Support & Troubleshooting

### Common Issues

**"Ollama not running"**
```bash
curl http://localhost:11434
# Should return: "Ollama is running"
# If not: ollama serve
```

**"No models found"**
```bash
ollama list
# If empty: ollama pull llama3.1:8b
```

**"Companies not showing"**
- Clear browser localStorage
- Reload page (Ctrl+R)
- Companies auto-initialize

**See [LAUNCH-GUIDE.md](LAUNCH-GUIDE.md) for complete troubleshooting**

---

## 🎯 Roadmap

### Phase 1: Foundation (✅ Complete)
- [x] Multi-company management
- [x] Local LLM integration (Ollama)
- [x] AGI system prompts
- [x] Company selector UI
- [x] Strategic briefings
- [x] Voice input/output
- [x] Markdown rendering

### Phase 2: Intelligence (🚧 In Progress)
- [ ] Email integration (Gmail, Outlook)
- [ ] Teams/Slack scanning
- [ ] Historical decision tracking
- [ ] Competitor monitoring
- [ ] Market news integration
- [ ] Conflict detection

### Phase 3: Advanced (📋 Planned)
- [ ] Multi-user support
- [ ] Team collaboration
- [ ] Decision tracking & outcomes
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] API for integrations

---

## 🌟 Why Strategic Advisor?

### Traditional Approach
- ❌ Generic AI (ChatGPT, Claude) - No company context
- ❌ Human EAs/CoS - Limited capacity, expensive
- ❌ BI Dashboards - Reactive, no strategic guidance
- ❌ Executive Coaches - Expensive, limited availability

### Strategic Advisor
- ✅ Company-specific context and memory
- ✅ 24/7 availability with consistent quality
- ✅ Proactive insights and conflict detection
- ✅ Strategic reasoning (not just answers)
- ✅ Multi-company portfolio view
- ✅ 100% private with local AI
- ✅ $0/month ongoing costs

---

## 📞 Contact

**Deepesh V**  
deepesh.vellore@jerseytechpartners.com

**Companies:**
- Othain Group - Digital Transformation
- Jersey Technology Partners - IT Services
- Strivio LLC - Executive Intelligence Platform

---

**🚀 Launch your Strategic Advisor now and make better decisions across all your companies!**

```bash
# Get started
npm install
./start.sh  # or START.bat on Windows

# Enable privacy mode
ollama pull llama3.1:8b
# Settings → Local LLM → Enable
```

---

*Built with ❤️ for executives who need an external brain*
