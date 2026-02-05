/**
 * Foundry Data Secure LLM Integration
 * Production-ready LLM service with streaming, error handling, and context management
 */

import { LLMConfig, LLMRequest, LLMResponse, Message } from '../types';
import { getDailyBriefing, analyzePriorities, extractAllActionItems, generateInsights } from './aiEngine';

// Default configuration (can be overridden via settings)
const DEFAULT_CONFIG: LLMConfig = {
  apiEndpoint: import.meta.env.VITE_FOUNDRY_API_ENDPOINT || '',
  apiKey: import.meta.env.VITE_FOUNDRY_API_KEY || '',
  model: import.meta.env.VITE_FOUNDRY_MODEL || 'foundry-llm-v1',
  maxTokens: 2000,
  temperature: 0.7,
  streaming: true,
};

let currentConfig: LLMConfig = { ...DEFAULT_CONFIG };

/**
 * Update LLM configuration
 */
export const updateLLMConfig = (config: Partial<LLMConfig>) => {
  currentConfig = { ...currentConfig, ...config };
  console.log('✅ Foundry LLM configuration updated');
};

/**
 * Get current LLM configuration
 */
export const getLLMConfig = (): LLMConfig => {
  return { ...currentConfig };
};

/**
 * Check if Foundry LLM is configured
 */
export const isFoundryConfigured = (): boolean => {
  return !!(currentConfig.apiEndpoint && currentConfig.apiKey);
};

/**
 * Build context from synthetic data for AI
 */
const buildConversationContext = (): string => {
  const { topPriorities } = analyzePriorities();
  const actions = extractAllActionItems();
  const insights = generateInsights();

  let context = 'CURRENT CONTEXT:\n\n';

  // Priority summary
  context += '## Top Priorities:\n';
  topPriorities.slice(0, 5).forEach((priority, i) => {
    context += `${i + 1}. [${priority.priority.toUpperCase()}] ${priority.title}\n`;
    context += `   Source: ${priority.source}\n`;
    context += `   ${priority.description.substring(0, 150)}...\n\n`;
  });

  // Action items
  context += '\n## Action Items:\n';
  actions.slice(0, 5).forEach((action, i) => {
    const deadline = action.dueDate ? ` (Due: ${action.dueDate.toLocaleDateString()})` : '';
    context += `${i + 1}. ${action.description.substring(0, 100)}${deadline}\n`;
  });

  // Key insights
  context += '\n## Key Insights:\n';
  insights.slice(0, 3).forEach((insight, i) => {
    context += `${i + 1}. ${insight.title}\n`;
    context += `   ${insight.description}\n\n`;
  });

  return context;
};

/**
 * Generate system prompt with strategic context
 */
const getSystemPrompt = (): string => {
  return `You are a Strategic Coworker AI - an executive assistant that helps busy professionals manage their communications and make strategic decisions.

Your role:
- Analyze messages across Teams, Outlook, WhatsApp, Gmail, and Calendar
- Identify urgent priorities and action items
- Provide strategic recommendations
- Help with time management and delegation
- Offer executive-level insights

Communication style:
- Concise and actionable
- Executive-focused (no unnecessary details)
- Strategic perspective (focus on impact and outcomes)
- Proactive suggestions
- Empathetic but professional

When responding:
- Always reference specific messages and sources when relevant
- Prioritize by urgency AND business impact
- Suggest concrete next steps
- Consider the user's time and energy constraints
- Think like a strategic advisor, not just a task manager

${buildConversationContext()}`;
};

/**
 * Call Foundry LLM API
 */
export const callFoundryLLM = async (
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  onStream?: (chunk: string) => void
): Promise<LLMResponse> => {
  // Check if configured
  if (!isFoundryConfigured()) {
    console.warn('⚠️ Foundry LLM not configured, using mock response');
    return generateMockResponse(messages);
  }

  try {
    const request: LLMRequest = {
      messages,
      temperature: currentConfig.temperature,
      maxTokens: currentConfig.maxTokens,
      stream: currentConfig.streaming && !!onStream,
    };

    const response = await fetch(currentConfig.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentConfig.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Foundry API error: ${response.status} ${response.statusText}`);
    }

    // Handle streaming response
    if (currentConfig.streaming && onStream && response.body) {
      return handleStreamingResponse(response, onStream);
    }

    // Handle regular response
    const data = await response.json();
    return {
      id: data.id || `foundry-${Date.now()}`,
      content: data.content || data.choices?.[0]?.message?.content || '',
      model: currentConfig.model,
      usage: data.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: data.finish_reason || 'stop',
    };
  } catch (error) {
    console.error('❌ Foundry LLM error:', error);
    // Fallback to mock response
    return generateMockResponse(messages);
  }
};

/**
 * Handle streaming response from Foundry
 */
const handleStreamingResponse = async (
  response: Response,
  onStream: (chunk: string) => void
): Promise<LLMResponse> => {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  if (!reader) {
    throw new Error('No response body');
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              onStream(content);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    return {
      id: `foundry-stream-${Date.now()}`,
      content: fullContent,
      model: currentConfig.model,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: 'stop',
    };
  } catch (error) {
    console.error('❌ Streaming error:', error);
    throw error;
  }
};

/**
 * Generate conversational response
 */
export const generateConversationalResponse = async (
  userMessage: string,
  conversationHistory: Message[],
  onStream?: (chunk: string) => void
): Promise<Message> => {
  // Build message array for LLM
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: getSystemPrompt() },
  ];

  // Add conversation history (last 5 messages for context)
  conversationHistory.slice(-5).forEach(msg => {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  });

  // Add current user message
  messages.push({ role: 'user', content: userMessage });

  // Call LLM
  const response = await callFoundryLLM(messages, onStream);

  // Create message object
  const message: Message = {
    id: `msg-${Date.now()}`,
    role: 'assistant',
    content: response.content,
    timestamp: new Date(),
    metadata: {
      sources: ['Teams', 'Email', 'Calendar', 'WhatsApp'],
      priority: undefined,
    },
  };

  return message;
};

/**
 * Generate mock response for development/fallback
 */
const generateMockResponse = (
  messages: Array<{ role: string; content: string }>
): LLMResponse => {
  const userMessage = messages[messages.length - 1]?.content.toLowerCase() || '';

  let content = '';

  if (userMessage.includes('briefing') || userMessage.includes('summary') || userMessage.includes('overview')) {
    content = getDailyBriefing();
  } else if (userMessage.includes('priority') || userMessage.includes('urgent') || userMessage.includes('important')) {
    const { topPriorities } = analyzePriorities();
    content = '# Your Top Priorities\n\n';
    content += 'Based on my analysis of your communications, here are your most critical items:\n\n';
    topPriorities.slice(0, 5).forEach((p, i) => {
      const emoji = p.priority === 'urgent' ? '🔴' : p.priority === 'high' ? '🟠' : '🟡';
      content += `${i + 1}. ${emoji} **${p.title}**\n`;
      content += `   - ${p.description.substring(0, 150)}...\n`;
      content += `   - Source: ${p.source}\n\n`;
    });
  } else if (userMessage.includes('action') || userMessage.includes('todo') || userMessage.includes('task')) {
    const actions = extractAllActionItems();
    content = '# Action Items\n\n';
    content += `I've identified ${actions.length} action items from your communications:\n\n`;
    actions.slice(0, 8).forEach((a, i) => {
      const deadline = a.dueDate ? ` ⏰ Due ${a.dueDate.toLocaleDateString()}` : '';
      content += `${i + 1}. ${a.description.substring(0, 100)}${deadline}\n`;
      content += `   - Source: ${a.source}\n\n`;
    });
  } else if (userMessage.includes('meeting') || userMessage.includes('calendar')) {
    content = '# Your Meeting Schedule\n\n';
    content += 'Here are your upcoming meetings:\n\n';
    content += '**Today:**\n';
    content += '- 11:00 AM - Production Issue Review (1 hr) 🔴 URGENT\n';
    content += '- 2:00 PM - Q1 Budget Review (1.5 hrs) - Prep Required\n';
    content += '- 3:00 PM - Client Call - Acme Corp (45 min)\n';
    content += '- 4:30 PM - 1:1 with James (30 min)\n\n';
    content += '**Tomorrow:**\n';
    content += '- 10:00 AM - Q1 Strategy Review (2 hrs) - Prep Required\n';
    content += '- 2:00 PM - Architecture Review (1.5 hrs)\n\n';
    content += 'The Q1 Budget Review at 2 PM today is your most critical meeting.';
  } else if (userMessage.includes('help') || userMessage.includes('what can you')) {
    content = '# How I Can Help You\n\n';
    content += 'I\'m your strategic coworker! Here\'s what I can do:\n\n';
    content += '**📊 Priority Management**\n';
    content += '- Analyze all your communications and identify what\'s urgent\n';
    content += '- Rank items by business impact and time sensitivity\n';
    content += '- Surface action items that need your attention\n\n';
    content += '**💡 Strategic Guidance**\n';
    content += '- Daily briefings with key insights\n';
    content += '- Time management recommendations\n';
    content += '- Delegation suggestions\n';
    content += '- Pattern recognition in your communications\n\n';
    content += '**🔍 Deep Analysis**\n';
    content += '- Summarize specific channels (Teams, Email, etc.)\n';
    content += '- Provide context before meetings\n';
    content += '- Track trends and communication patterns\n\n';
    content += 'Try asking: "What are my priorities?" or "Give me my daily briefing"';
  } else if (userMessage.includes('focus') || userMessage.includes('should i work on')) {
    content = '# Recommended Focus\n\n';
    content += 'Based on urgency and impact analysis:\n\n';
    content += '**Next 1-2 hours (Immediate):**\n';
    content += '1. Address production API issues - team is blocked\n';
    content += '2. Approve deployment rollback in pipeline\n';
    content += '3. Respond to TechStart client escalation\n\n';
    content += '**Before 2 PM (Today):**\n';
    content += '1. Prepare for Q1 Budget Review meeting\n';
    content += '2. Review budget variance explanations\n';
    content += '3. Submit OKR updates for board meeting\n\n';
    content += '**This Afternoon:**\n';
    content += '1. Acme Corp client call preparation\n';
    content += '2. Review security audit findings\n';
    content += '3. Respond to CEO board presentation request\n\n';
    content += 'This sequence handles critical blockers first while ensuring meeting preparation.';
  } else {
    // Default response
    content = '# Communication Overview\n\n';
    content += 'I\'ve analyzed your communications across all channels. Here\'s what stands out:\n\n';
    content += '**📊 Current Status:**\n';
    content += '- 3 urgent items requiring immediate attention\n';
    content += '- 7 high-priority items\n';
    content += '- 15 action items extracted\n';
    content += '- 4 meetings scheduled today\n\n';
    content += '**🎯 Key Focus Areas:**\n';
    content += '1. Production stability (API errors affecting clients)\n';
    content += '2. Q1 budget review and financial planning\n';
    content += '3. Client relationship management (multiple escalations)\n\n';
    content += 'What would you like to dive into? I can provide priorities, action items, meeting prep, or strategic recommendations.';
  }

  return {
    id: `mock-${Date.now()}`,
    content,
    model: 'mock-strategic-ai',
    usage: {
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300,
    },
    finishReason: 'stop',
  };
};

/**
 * Generate daily briefing on app launch
 */
export const generateDailyBriefingMessage = async (): Promise<Message> => {
  const briefing = getDailyBriefing();
  
  return {
    id: `briefing-${Date.now()}`,
    role: 'assistant',
    content: briefing,
    timestamp: new Date(),
    metadata: {
      sources: ['Teams', 'Email', 'WhatsApp', 'Calendar'],
      priority: 'high',
    },
  };
};

/**
 * Initialize Foundry LLM service
 */
export const initializeFoundryLLM = () => {
  console.log('🔐 Initializing Foundry Data Secure LLM...');
  
  if (isFoundryConfigured()) {
    console.log(`✅ Foundry LLM configured: ${currentConfig.apiEndpoint}`);
    console.log(`📊 Model: ${currentConfig.model}`);
    console.log(`🌊 Streaming: ${currentConfig.streaming ? 'Enabled' : 'Disabled'}`);
  } else {
    console.log('⚠️ Foundry LLM not configured - using mock responses');
    console.log('💡 Set VITE_FOUNDRY_API_ENDPOINT and VITE_FOUNDRY_API_KEY in .env');
  }
};
