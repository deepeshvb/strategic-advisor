# CEO System Prompt - Integration Guide

This guide shows how to integrate the CEO-focused strategic system prompt into your application.

## What You've Got

1. **System Prompt**: `src/prompts/ceo-system-prompt.ts` - The complete strategic prompt for CEO/founder use
2. **AI Service**: `src/services/ceoAIService.ts` - Integration layer with LLM APIs
3. **Examples**: `src/examples/ceo-response-examples.md` - Sample responses showing how it works

## Quick Start

### Option 1: OpenAI Integration

1. **Install OpenAI SDK:**
```bash
npm install openai
```

2. **Add API key to `.env`:**
```
VITE_OPENAI_API_KEY=sk-your-api-key-here
```

3. **Update `src/services/ceoAIService.ts`:**

Uncomment the OpenAI section (lines ~31-58) and remove the placeholder response.

4. **Use in your ChatInterface:**

```typescript
import { generateCEOResponse } from '../services/ceoAIService';
import { syntheticTeamsMessages, syntheticOutlookEmails, syntheticCalendarEvents } from '../services/syntheticData';

// In your handleSend function:
const aiResponse = await generateCEOResponse(input, {
  teamsMessages: syntheticTeamsMessages,
  emails: syntheticOutlookEmails,
  calendarEvents: syntheticCalendarEvents,
  currentInitiatives: [
    'Q1 Fundraising',
    'Product Launch v2.0',
    'Team expansion'
  ],
  urgentIssues: [
    'Production incident from yesterday',
    'Board meeting next week needs deck'
  ]
});
```

### Option 2: Anthropic Claude Integration (Recommended for Strategic Work)

Claude is particularly strong at strategic analysis and executive communication.

1. **Install Anthropic SDK:**
```bash
npm install @anthropic-ai/sdk
```

2. **Add API key to `.env`:**
```
VITE_ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

3. **Update `src/services/ceoAIService.ts`:**

Uncomment the Anthropic section (lines ~62-89) and remove the placeholder response.

4. **Same usage as above** - the interface is identical

## Integration Steps

### Step 1: Update ChatInterface.tsx

Replace the mock response with real AI:

```typescript
// OLD (line ~146):
const aiResponse = generateAIResponse(input, context);

// NEW:
import { generateCEOResponse } from '../services/ceoAIService';
import { 
  syntheticTeamsMessages, 
  syntheticOutlookEmails, 
  syntheticCalendarEvents 
} from '../services/syntheticData';

// In handleSend function:
const aiResponse = await generateCEOResponse(input, {
  teamsMessages: syntheticTeamsMessages.slice(0, 30), // Most recent 30
  emails: syntheticOutlookEmails.slice(0, 20), // Most recent 20
  calendarEvents: syntheticCalendarEvents.filter(e => 
    e.startTime.getTime() > Date.now() // Only future events
  ).slice(0, 10),
});
```

### Step 2: Add Context Panel (Optional but Recommended)

Create a sidebar showing what data the AI is analyzing:

```typescript
// src/components/ContextPanel.tsx
export default function ContextPanel({ context }: { context: CEOContext }) {
  return (
    <div className="w-64 bg-slate-800 border-l border-slate-700 p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">AI Context</h3>
      
      <div className="space-y-3">
        <div>
          <div className="text-xs text-gray-500">Teams Messages</div>
          <div className="text-lg font-semibold">{context.teamsMessages?.length || 0}</div>
        </div>
        
        <div>
          <div className="text-xs text-gray-500">Emails</div>
          <div className="text-lg font-semibold">{context.emails?.length || 0}</div>
        </div>
        
        <div>
          <div className="text-xs text-gray-500">Upcoming Meetings</div>
          <div className="text-lg font-semibold">{context.calendarEvents?.length || 0}</div>
        </div>
      </div>
      
      {context.urgentIssues && context.urgentIssues.length > 0 && (
        <div className="mt-4 p-3 bg-red-900/20 rounded border border-red-800">
          <div className="text-xs font-semibold text-red-400 mb-2">Urgent Issues</div>
          <ul className="text-xs space-y-1">
            {context.urgentIssues.map((issue, i) => (
              <li key={i} className="text-gray-300">• {issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Step 3: Add Pre-built Queries

Add CEO-specific quick action buttons:

```typescript
// In ChatInterface.tsx, replace the quick action buttons:
<div className="mt-2 flex gap-2 flex-wrap">
  <button
    onClick={() => setInput('Give me my strategic briefing for today. What are my top priorities and what clarifications do I need?')}
    className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-full transition-colors"
  >
    📊 Strategic Briefing
  </button>
  <button
    onClick={() => setInput('What are the ground truth issues I need to know about across all my channels?')}
    className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-full transition-colors"
  >
    🎯 Ground Truth
  </button>
  <button
    onClick={() => setInput('What meetings should I prep for and what context do I need?')}
    className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-full transition-colors"
  >
    📅 Meeting Prep
  </button>
  <button
    onClick={() => setInput('What ambiguous situations need clarification from me? Give me a strategy for each.')}
    className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-full transition-colors"
  >
    ❓ Clarification Strategy
  </button>
  <button
    onClick={() => setInput('What can I delegate vs. what actually needs my attention?')}
    className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-full transition-colors"
  >
    🎪 Delegate vs. Do
  </button>
</div>
```

## Testing Your Integration

### 1. Test with Mock Data (Current State)

Your app already has rich synthetic data. Test queries like:

- "What's urgent today?"
- "I'm seeing conflicting information about the budget meeting - what's the ground truth?"
- "What should I focus on in the next 2 hours?"

### 2. Check Response Quality

The AI should:
- ✅ Lead with a 2-3 sentence executive summary
- ✅ Identify specific actions with clear timelines
- ✅ Flag information gaps and provide clarification strategies
- ✅ Distinguish what needs CEO attention vs. what can be delegated
- ✅ Use direct, strategic language (not overly formal or vague)

### 3. Validate Context Integration

The AI should reference specific:
- Messages by sender and channel
- Emails by subject and sender
- Calendar events by time
- Patterns across multiple communications

## Advanced: Custom Context

Add your own strategic context:

```typescript
const ceoContext: CEOContext = {
  teamsMessages: syntheticTeamsMessages,
  emails: syntheticOutlookEmails,
  calendarEvents: syntheticCalendarEvents,
  
  // Add your strategic context:
  currentInitiatives: [
    'Q1 2026 Fundraising (Series B, $20M target)',
    'Product Launch v2.0 (March 15 deadline)',
    'Hiring: VP Sales, VP Marketing, 3 engineers',
    'Customer expansion: Acme Corp (potential $500K deal)'
  ],
  
  urgentIssues: [
    'Production outage yesterday - need post-mortem',
    'Board meeting next Wednesday - deck not ready',
    'Top customer (GlobalCorp) raised concerns about pricing'
  ],
  
  keyStakeholders: [
    'Sarah Chen (Board Member, concerned about burn rate)',
    'Alex Rodriguez (Largest customer)',
    'Jamie Lee (CTO, pushing for technical debt work)',
    'Morgan Smith (VP Sales, aggressive growth targets)'
  ],
  
  recentDecisions: [
    'Jan 15: Decided to delay Feature X for technical debt',
    'Jan 22: Approved hiring plan for 10 new employees',
    'Feb 1: Committed to Series B fundraising timeline'
  ]
};

const response = await generateCEOResponse(userMessage, ceoContext);
```

## Cost Considerations

### OpenAI Pricing (GPT-4)
- ~$0.03 per request for typical context size
- ~$1 per day with 30-40 queries
- Cheaper with GPT-3.5 but lower quality strategic analysis

### Anthropic Pricing (Claude)
- ~$0.04 per request with Claude 3.5 Sonnet
- ~$0.10 per request with Claude 3 Opus (highest quality)
- Excellent at strategic analysis and executive communication

### Recommendation
- **For daily use**: Claude 3.5 Sonnet (best balance of cost/quality)
- **For critical decisions**: Claude 3 Opus (maximum reasoning capability)
- **For high volume**: GPT-4 Turbo (faster, cheaper, still very good)

## Monitoring & Iteration

### Track These Metrics

1. **Response Quality:**
   - Does it identify ground truth correctly?
   - Are clarification strategies actionable?
   - Does it distinguish urgent from important?

2. **Time Savings:**
   - How much time spent reading messages before?
   - How much time spent after with AI synthesis?

3. **Decision Quality:**
   - Are you catching important issues earlier?
   - Are you delegating more effectively?
   - Are you getting clarity on ambiguous situations faster?

### Improve Over Time

The system prompt can be customized:

```typescript
// Add to your .env or config:
VITE_CEO_NAME="Your Name"
VITE_COMPANY_STAGE="Series A startup, 25 employees"
VITE_KEY_PRIORITIES="Fundraising, Product-Market Fit, Team Building"

// Then customize the prompt:
const customPrompt = `${CEO_SYSTEM_PROMPT}

## Additional Context for ${process.env.VITE_CEO_NAME}

Company Stage: ${process.env.VITE_COMPANY_STAGE}
Current Top Priorities: ${process.env.VITE_KEY_PRIORITIES}

Communication Style Preferences:
- Even more direct than the base prompt suggests
- Always lead with the decision recommendation
- Include rough probability estimates (e.g., "80% confident this is...")
`;
```

## Next Steps

1. **Choose your LLM provider** (OpenAI or Anthropic)
2. **Get API key** and add to `.env`
3. **Uncomment integration code** in `ceoAIService.ts`
4. **Update ChatInterface** to use real AI instead of mock
5. **Test with your synthetic data**
6. **Customize the prompt** based on your needs
7. **Connect real channels** (Teams, Gmail, etc.) when ready

## Questions?

The system prompt (`src/prompts/ceo-system-prompt.ts`) is extensively documented and can be customized for your specific:
- Communication style
- Industry/company stage  
- Strategic priorities
- Decision-making frameworks

Start with the defaults, then refine based on what works for you.

---

**Pro Tip:** The real power comes from feeding it REAL data from your communication channels. The synthetic data demonstrates the concept, but connecting actual Teams, Gmail, and Calendar data will provide genuine strategic value.
