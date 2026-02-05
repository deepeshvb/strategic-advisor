# 🚀 Quick Start - CEO Edition

Your Strategic Coworker is ready to use with Claude 3.5 Sonnet!

## ⚡ Instant Start (Windows)

**Double-click:** `start-ceo-app.bat`

This will:
1. Install dependencies (first time only)
2. Check your API key
3. Start the development server
4. Open your browser automatically

## 📋 Manual Start

```bash
# Install dependencies (first time only)
npm install

# Start the app
npm run dev
```

Then open: `http://localhost:5173`

## 🎯 Try These First

Once the app loads, click these quick actions:

1. **📊 Strategic Briefing** - Get your CEO-level daily overview
2. **🎯 Ground Truth** - See what's really happening across channels
3. **❓ Clarification Strategy** - Get specific questions to ask

## 💬 Example Questions

### Morning Planning
```
"What's my strategic focus for today?"
"What are the top 3 things only I can handle?"
```

### Ground Truth Analysis
```
"What's really happening with the budget meeting?"
"Where are there conflicting signals in my messages?"
```

### Clarification Strategy
```
"What ambiguous situations need clarification from me?"
"I'm seeing different versions about the product launch - what should I ask?"
```

### Delegation
```
"What can I delegate vs. what needs my attention?"
"Which of these issues should my team handle?"
```

## 🔧 What's Happening Behind the Scenes

The AI analyzes:
- ✅ 30 most recent Teams messages (last 24h)
- ✅ 20 most recent emails (last 24h)
- ✅ 10 upcoming calendar events
- ✅ Urgent issues across all channels

Then provides:
- 🎯 Ground truth extraction
- 📊 Strategic priorities
- ❓ Clarification strategies
- 🎪 Delegation recommendations

## 📊 Data Source

Currently using **synthetic data** (see `src/services/syntheticData.ts`):
- 50+ realistic Teams messages
- 40+ realistic emails
- 25+ calendar events
- Realistic urgency levels and patterns

This demonstrates the AI's capabilities. Later, you can connect real channels.

## 🎨 Features

- **Voice Input**: Click the 🎤 microphone to speak your questions
- **Voice Output**: Responses are read aloud automatically
- **Smart Context**: AI sees all your communication channels
- **CEO-Focused**: Designed specifically for executive strategic thinking

## ⚙️ Customization

### Add Your Strategic Context

Edit `src/components/ChatInterface.tsx`, find `buildCEOContext()`:

```typescript
currentInitiatives: [
  'Your strategic initiative 1',
  'Your strategic initiative 2',
  // Add more...
],
```

### Modify Response Style

Edit `src/prompts/ceo-system-prompt.ts` to adjust:
- Communication tone
- Response format
- Decision frameworks
- Industry-specific context

## 💰 Cost Per Query

**~$0.02-0.03 per query**

Typical daily usage (30-40 queries) = ~$0.60-1.20/day

**Worth every penny for CEO-level strategic intelligence!**

## 🆘 Troubleshooting

### "Anthropic SDK not found"
```bash
npm install
```

### API Key Issues
Check `.env` file has:
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

### Slow Responses
- Normal: 2-5 seconds
- Check internet connection
- Larger context = slower response

## 📚 Learn More

- **Full Integration Guide**: `CLAUDE-INTEGRATION-READY.md`
- **Response Examples**: `src/examples/ceo-response-examples.md`
- **System Prompt Details**: `src/prompts/ceo-system-prompt.ts`

## ✅ You're Ready!

Just run the app and start asking strategic questions. The AI will:

✅ Find ground truth in ambiguous situations
✅ Provide clarification strategies
✅ Distinguish CEO priorities from delegable work
✅ Offer strategic decision support

**Let's get started! 🚀**
