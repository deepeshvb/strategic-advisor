import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.backend' });

interface AIResponse {
  content: string;
  urgency: number; // 0-10 scale
  actionItems: string[];
  categories: string[];
}

class ClaudeService {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // No browser issues! Backend can call Claude directly
    this.client = new Anthropic({
      apiKey: apiKey,
    });
  }

  /**
   * Analyze CEO message/query using Claude
   */
  async analyzeQuery(query: string, context?: string): Promise<AIResponse> {
    try {
      console.log('🤖 Asking Claude:', query);

      const systemPrompt = this.getAGISystemPrompt();

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: context 
              ? `Context:\n${context}\n\n---\n\nCEO Question: ${query}`
              : query,
          },
        ],
      });

      const content = response.content[0];
      const text = content.type === 'text' ? content.text : 'No response';

      console.log('✅ Claude response received');

      return {
        content: text,
        urgency: this.detectUrgency(text),
        actionItems: this.extractActionItems(text),
        categories: this.categorize(text),
      };
    } catch (error) {
      console.error('❌ Claude API error:', error);
      throw error;
    }
  }

  /**
   * Analyze monitoring data for urgent issues
   */
  async analyzeMonitoringData(data: any): Promise<{
    urgentItems: any[];
    summary: string;
    urgencyScore: number;
  }> {
    const prompt = `
Analyze this organizational data and identify ONLY truly urgent items that require CEO attention TODAY.

Be highly selective - only flag items that are:
- Time-sensitive (deadline today/tomorrow)
- High-impact (affects revenue, key clients, or team morale)
- Blocking progress for multiple people
- Represent conflicts or escalations

Data:
${JSON.stringify(data, null, 2)}

Return a JSON response with:
{
  "urgentItems": [
    {
      "title": "Brief title",
      "description": "What needs attention and why",
      "urgency": 1-10,
      "source": "Teams/Email/etc",
      "actionRequired": "What CEO should do"
    }
  ],
  "summary": "One paragraph executive summary",
  "urgencyScore": 1-10 (overall urgency)
}
`;

    const response = await this.analyzeQuery(prompt);
    
    try {
      // Try to parse JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('Could not parse structured response, returning raw');
    }

    return {
      urgentItems: [],
      summary: response.content,
      urgencyScore: response.urgency,
    };
  }

  /**
   * AGI System Prompt for strategic CEO guidance
   */
  private getAGISystemPrompt(): string {
    return `You are an AGI-powered Strategic Intelligence Advisor for Deepesh Vellore, CEO/Founder of multiple companies:

**Companies:**
- Othain Group (parent holding company)
- OthainSoft (software development)
- Jersey Technology Partners (technology consulting)
- Strivio LLC (software products)

**Your Role:**
You are NOT a chatbot. You are an intelligent strategic advisor with AGI capabilities:

1. **Proactive Intelligence:** Identify patterns, conflicts, and blind spots across all communication channels
2. **Strategic Prioritization:** Focus only on what truly matters for CEO-level decisions
3. **Cross-Domain Synthesis:** Connect insights from emails, Teams chats, calendar, and market trends
4. **Predictive Guidance:** Anticipate issues before they escalate
5. **Conversational & Insightful:** Speak naturally, not like a report generator

**Communication Style:**
- Direct and concise
- Strategic, not tactical
- Highlight what the CEO might NOT be aware of
- Suggest actions, not just information
- Be conversational: "Good morning," "Here's what needs your attention," etc.

**Urgency Classification:**
10 = Emergency (revenue loss, legal issue, major client crisis)
9 = Critical (must handle today, blocking others)
8 = High (important but not blocking)
7 = Medium-High (address this week)
5-6 = Medium (important but not urgent)
1-4 = Low (FYI only)

**Only alert for items 8+ unless specifically asked.**

When the CEO says "hello" or casual greetings, respond warmly and ask how you can help, don't launch into summaries.`;
  }

  /**
   * Detect urgency level from AI response
   */
  private detectUrgency(text: string): number {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('emergency') || lowerText.includes('critical') || lowerText.includes('urgent')) {
      return 9;
    }
    if (lowerText.includes('high priority') || lowerText.includes('immediate')) {
      return 8;
    }
    if (lowerText.includes('important') || lowerText.includes('attention')) {
      return 7;
    }
    
    return 5;
  }

  /**
   * Extract action items from response
   */
  private extractActionItems(text: string): string[] {
    const items: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.match(/^[\-\*•]\s+/) || line.match(/^\d+\.\s+/)) {
        items.push(line.trim());
      }
    }

    return items.slice(0, 5); // Top 5 only
  }

  /**
   * Categorize the response
   */
  private categorize(text: string): string[] {
    const categories: string[] = [];
    const lowerText = text.toLowerCase();

    const categoryMap: Record<string, string[]> = {
      'Team Management': ['team', 'conflict', 'employee', 'morale'],
      'Client Relations': ['client', 'customer', 'account'],
      'Financial': ['revenue', 'budget', 'payment', 'invoice'],
      'Strategic': ['strategy', 'roadmap', 'planning', 'direction'],
      'Operations': ['project', 'delivery', 'deadline', 'milestone'],
      'Technical': ['bug', 'outage', 'technical', 'system'],
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(kw => lowerText.includes(kw))) {
        categories.push(category);
      }
    }

    return categories;
  }
}

export const claudeService = new ClaudeService();
