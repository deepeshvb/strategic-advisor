# How to Create AI Agents — A Beginner’s Guide

*A simple, step-by-step guide for non-technical people who want to build agents that do real things: answer questions, send messages, plan trips, and more. Written so anyone—including someone in their 20s just getting started—can follow along.*

---

## What is an “AI agent”?

An **AI agent** is a program that uses artificial intelligence to do tasks for you. Unlike a simple chatbot that only talks, an agent can:

- **Read and summarize** your emails or messages  
- **Send** emails, WhatsApp messages, or SMS  
- **Plan trips** (flights, hotels, restaurants)  
- **Remember** your preferences and remind you of things  
- **Take action** when you confirm (e.g. “book it” or “send the plan”)

You talk to it (by typing or even voice), and it uses AI plus connected services (email, WhatsApp, etc.) to get things done.

---

## What you’ll need: two kinds of things

1. **Tools on your computer** — software you install (code editor, Node.js, etc.).  
2. **Online accounts (portals)** — services you sign up for so your agent can send emails, WhatsApp, use AI, etc.

Below is a simple list of both, with links and reasons.

---

## Part 1 — Tools to install

Install these on your computer first. All have free tiers or free versions.

| Tool | What it is | Why you need it | Where to get it |
|------|------------|-----------------|-----------------|
| **Cursor** | A code editor with AI built in. You write and edit code; the AI helps you complete it, fix errors, and add features. | This is where you’ll build and change your agent. Think of it as “Word for code” with an AI assistant. | [cursor.com](https://cursor.com) — download the app for Windows or Mac. |
| **Node.js** | The runtime that runs JavaScript on your computer (not in a browser). Your agent’s backend is written in Node. | Without Node.js, the server that powers your agent won’t run. | [nodejs.org](https://nodejs.org) — choose the **LTS** version and install. |
| **Git** | Version control: it saves snapshots of your project so you can undo changes or try new ideas safely. | Optional but recommended. Lets you “save checkpoints” and collaborate or restore if something breaks. | [git-scm.com](https://git-scm.com) — download and install. |

### Quick checklist (tools)

- [ ] Install **Cursor** from [cursor.com](https://cursor.com)  
- [ ] Install **Node.js** (LTS) from [nodejs.org](https://nodejs.org)  
- [ ] (Optional) Install **Git** from [git-scm.com](https://git-scm.com)  

After installing Node.js, open a terminal (Command Prompt on Windows, Terminal on Mac) and type:

```bash
node --version
```

You should see a version number (e.g. `v20.x.x`). If so, you’re set.

---

## Part 2 — Portals and accounts to sign up for

Your agent needs to talk to the outside world: AI for understanding and writing, email for sending messages, WhatsApp/SMS for texts, etc. Each of these is a separate service you sign up for. You don’t need every one on day one; start with AI + one channel (e.g. email).

| Service | What it’s for | Why sign up | Link / notes |
|---------|----------------|-------------|---------------|
| **Anthropic (Claude)** | AI that reads and writes text (summaries, travel plans, replies). | Your agent uses Claude to understand what the user wants and to generate answers and plans. | [console.anthropic.com](https://console.anthropic.com) — sign up, create an API key, and add it to your project. Paid per use; small usage is cheap. |
| **Ollama** (optional) | Run an AI model on your own computer (e.g. Llama). | Free alternative to Claude for testing; your app can “prefer” Ollama and fall back to Claude if needed. | [ollama.com](https://ollama.com) — install, then run e.g. `ollama run llama3.1` in a terminal. |
| **Twilio** | Send and receive **SMS** and **WhatsApp** messages. | So your agent can text the user and get replies (e.g. “Send my briefing to WhatsApp” or “Confirm booking via WhatsApp”). | [twilio.com](https://www.twilio.com) — sign up, get Account SID and Auth Token. For WhatsApp you start in the **Sandbox** (only people who join your sandbox get messages); for production, see [Twilio WhatsApp getting started](https://www.twilio.com/docs/whatsapp/getting-started). |
| **SendGrid** (or Gmail SMTP) | Send **email** from your agent. | So the agent can email briefings, travel plans, and replies. | [sendgrid.com](https://sendgrid.com) — sign up, create an API key. Or use Gmail with an “App Password” for SMTP. |
| **Azure / Microsoft 365** (optional) | Read **Outlook** mail, **Teams**, and **Calendar** (for an “insights” or “briefing” agent). | If you want the agent to summarize company email or Teams, you need Microsoft Graph API access via Azure. | [portal.azure.com](https://portal.azure.com) — create an app registration, get Client ID, Client Secret, Tenant ID; give the app Mail.Read, etc. Only needed for Outlook/Teams features. |
| **Stripe** (optional) | Securely handle **payments** (e.g. for booking travel). | If your agent takes payments, you use Stripe to tokenize cards (you never store raw card numbers). | [stripe.com](https://stripe.com) — sign up, get publishable and secret keys. Only needed if you add “pay and book” flows. |

### Quick checklist (portals)

- [ ] **Anthropic** — [console.anthropic.com](https://console.anthropic.com) → API keys → create key → copy it into your project’s `.env` or config.  
- [ ] **Twilio** — [twilio.com](https://www.twilio.com) → Console → Account SID + Auth Token; for WhatsApp, open the WhatsApp Sandbox and follow the join instructions.  
- [ ] **SendGrid** — [sendgrid.com](https://sendgrid.com) → API Keys → create key → add to config for “from” email.  
- [ ] (Optional) **Ollama** — [ollama.com](https://ollama.com) — install and run a model if you want free local AI.  
- [ ] (Optional) **Azure** — only if you want Outlook/Teams/Calendar in your agent.  
- [ ] (Optional) **Stripe** — only if you want to charge for bookings.  

---

## How it fits together (simple picture)

```
You (or your user)
    ↓
  WhatsApp / Email / App
    ↓
Your backend (Node.js)  ←  “What did they ask? Send it to the AI.”
    ↓
AI (Claude or Ollama)   ←  “Understand and generate a reply or plan.”
    ↓
Your backend again      ←  “Send the reply by email/WhatsApp, save reminders, etc.”
    ↓
Twilio / SendGrid / etc.
    ↓
User gets message or action
```

- **Cursor** = where you write and edit the backend and frontend code.  
- **Node.js** = what runs that code.  
- **Portals** = the services that actually send the email, WhatsApp, or call the AI. Your code talks to them using **API keys** (like passwords you put in a `.env` file and never share).

---

## Tips for beginners

1. **Start small**  
   Get one thing working first (e.g. “user sends a message → AI replies once”). Then add email, then WhatsApp, then something like travel planning.

2. **Keep API keys secret**  
   Put them in a `.env` or `.env.backend` file and add that file to `.gitignore` so you never commit keys to the internet.

3. **Use the AI inside Cursor**  
   You can describe what you want in plain English (“add a field for origin and destination”) and Cursor’s AI will suggest code. Great for learning.

4. **Read the docs in small steps**  
   Twilio, Anthropic, and SendGrid all have “Quickstart” or “Get started” pages. Do one at a time.

5. **Copy a working project**  
   Starting from an existing agent (like this Strategic Coworker app) and changing one thing (e.g. the prompt or the WhatsApp message) is often easier than building from zero.

---

## Next steps

1. Install the **tools** (Cursor, Node.js, optionally Git).  
2. Sign up for **Anthropic** and **Twilio** (and **SendGrid** if you want email).  
3. Open this project in **Cursor**, add your API keys to the config or `.env` file, and run the backend (e.g. run the start script the project provides).  
4. Send a test WhatsApp message or email to your agent and see it reply.  
5. Change one small thing (e.g. the welcome message or one prompt) and run again.  
6. When ready, read the service-specific docs (Twilio WhatsApp, SendGrid, etc.) to add more features.

---

## Links at a glance

| What | Link |
|------|------|
| Cursor (editor) | [cursor.com](https://cursor.com) |
| Node.js | [nodejs.org](https://nodejs.org) |
| Git | [git-scm.com](https://git-scm.com) |
| Anthropic (Claude) | [console.anthropic.com](https://console.anthropic.com) |
| Ollama (local AI) | [ollama.com](https://ollama.com) |
| Twilio (SMS / WhatsApp) | [twilio.com](https://www.twilio.com) |
| Twilio WhatsApp (production) | [Twilio WhatsApp getting started](https://www.twilio.com/docs/whatsapp/getting-started) |
| SendGrid (email) | [sendgrid.com](https://sendgrid.com) |
| Azure (Outlook/Teams) | [portal.azure.com](https://portal.azure.com) |
| Stripe (payments) | [stripe.com](https://stripe.com) |

---

*You can copy this entire document into Notion: create a new page, paste the markdown, and Notion will format headings, tables, checklists, and links. You can then add your own notes, screenshots, or step-by-step checklists for your kids or team.*
