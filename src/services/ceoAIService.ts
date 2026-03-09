/**
 * CEO-Focused AI Service
 * Integrates with Claude 3.5 Sonnet using the strategic CEO system prompt
 */

import Anthropic from '@anthropic-ai/sdk';
import { CEO_SYSTEM_PROMPT } from '../prompts/ceo-system-prompt';
import { AGI_STRATEGIC_PROMPT } from '../prompts/agi-strategic-prompt';
import { Message } from '../types';
import { localLLMService } from './localLLMService';
import { companyService } from './companyService';

/**
 * Context structure for CEO strategic analysis
 */
export interface CEOContext {
  // Communication data
  teamsMessages: Array<{
    channel: string;
    sender: string;
    content: string;
    timestamp: Date;
    priority: string;
    mentions?: string[];
  }>;
  emails: Array<{
    from: string;
    subject: string;
    body: string;
    timestamp: Date;
    priority: string;
  }>;
  calendarEvents: Array<{
    title: string;
    description: string;
    startTime: Date;
    attendees: string[];
    requiresPrep: boolean;
  }>;
  
  // Strategic context
  recentDecisions?: string[];
  currentInitiatives?: string[];
  keyStakeholders?: string[];
  urgentIssues?: string[];
}

/**
 * Format context into a structured prompt for the LLM
 */
function formatContextForLLM(context: CEOContext): string {
  const now = new Date();
  
  let contextPrompt = `# Current Date & Time\n${now.toLocaleString()}\n\n`;
  
  // Recent Teams Messages
  if (context.teamsMessages?.length > 0) {
    contextPrompt += `# Teams Messages (Last 24 Hours)\n\n`;
    context.teamsMessages
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20) // Most recent 20
      .forEach(msg => {
        const timeAgo = Math.round((now.getTime() - msg.timestamp.getTime()) / 60000);
        contextPrompt += `**[${msg.channel}]** ${msg.sender} (${timeAgo}m ago) [${msg.priority}]:\n`;
        contextPrompt += `${msg.content}\n\n`;
      });
  }
  
  // Recent Emails
  if (context.emails?.length > 0) {
    contextPrompt += `# Email (Unread/Recent)\n\n`;
    context.emails
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 15) // Most recent 15
      .forEach(email => {
        const timeAgo = Math.round((now.getTime() - email.timestamp.getTime()) / 60000);
        contextPrompt += `**From:** ${email.from} (${timeAgo}m ago) [${email.priority}]\n`;
        contextPrompt += `**Subject:** ${email.subject}\n`;
        contextPrompt += `**Body:** ${email.body.substring(0, 300)}${email.body.length > 300 ? '...' : ''}\n\n`;
      });
  }
  
  // Upcoming Calendar
  if (context.calendarEvents?.length > 0) {
    contextPrompt += `# Calendar (Next 48 Hours)\n\n`;
    context.calendarEvents
      .filter(e => e.startTime.getTime() > now.getTime())
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .slice(0, 10)
      .forEach(event => {
        const hoursUntil = Math.round((event.startTime.getTime() - now.getTime()) / 3600000);
        contextPrompt += `**${event.title}** (in ${hoursUntil}h)\n`;
        contextPrompt += `- Attendees: ${event.attendees.join(', ')}\n`;
        contextPrompt += `- Description: ${event.description}\n`;
        contextPrompt += `- Prep needed: ${event.requiresPrep ? 'YES ⚠️' : 'No'}\n\n`;
      });
  }
  
  // Strategic Context
  if (context.currentInitiatives?.length) {
    contextPrompt += `# Current Strategic Initiatives\n`;
    context.currentInitiatives.forEach(init => contextPrompt += `- ${init}\n`);
    contextPrompt += `\n`;
  }
  
  if (context.urgentIssues?.length) {
    contextPrompt += `# Known Urgent Issues\n`;
    context.urgentIssues.forEach(issue => contextPrompt += `- ${issue}\n`);
    contextPrompt += `\n`;
  }
  
  return contextPrompt;
}

/**
 * Format company context for LLM
 */
function formatCompanyContext(companyContext: any): string {
  let prompt = `# Company Context\n\n`;
  
  if (companyContext.company) {
    const company = companyContext.company;
    prompt += `## ${company.name}\n`;
    prompt += `**Industry:** ${company.industry}\n`;
    prompt += `**Description:** ${company.description}\n\n`;
    
    if (company.strategicPosition) {
      prompt += `**Strategic Position:** ${company.strategicPosition}\n\n`;
    }
    
    if (company.keyGoals?.length) {
      prompt += `**Key Goals:**\n`;
      company.keyGoals.forEach((goal: string) => prompt += `- ${goal}\n`);
      prompt += `\n`;
    }
    
    if (company.competitors?.length) {
      prompt += `**Competitors:** ${company.competitors.join(', ')}\n\n`;
    }
    
    if (company.keyMetrics) {
      prompt += `**Key Metrics:**\n`;
      Object.entries(company.keyMetrics).forEach(([key, value]) => {
        prompt += `- ${key}: ${value}\n`;
      });
      prompt += `\n`;
    }
  }
  
  if (companyContext.historicalDecisions?.length) {
    prompt += `## Recent Strategic Decisions\n`;
    companyContext.historicalDecisions.slice(0, 5).forEach((decision: any) => {
      const date = new Date(decision.date).toLocaleDateString();
      prompt += `- **${date}:** ${decision.decision}\n`;
      if (decision.outcome) {
        prompt += `  Outcome: ${decision.outcome}\n`;
      }
    });
    prompt += `\n`;
  }
  
  if (companyContext.marketIntelligence) {
    prompt += `## Market Intelligence\n`;
    prompt += `${companyContext.marketIntelligence}\n\n`;
  }
  
  if (companyContext.competitorActivity) {
    prompt += `## Competitor Activity\n`;
    prompt += `${companyContext.competitorActivity}\n\n`;
  }
  
  if (companyContext.industryTrends) {
    prompt += `## Industry Trends\n`;
    prompt += `${companyContext.industryTrends}\n\n`;
  }
  
  return prompt;
}

/**
 * Generate CEO-focused strategic response using Claude 3.5 Sonnet
 */
export async function generateCEOResponse(
  userMessage: string,
  context: CEOContext
): Promise<Message> {
  
  // Detect casual greetings and respond conversationally
  const greetingPattern = /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)[\s!.]*$/i;
  if (greetingPattern.test(userMessage.trim())) {
    return generateGreetingResponse();
  }

  // Detect brief/short update requests
  const briefPattern = /(brief|quick|short|summary|tldr|headlines|what'?s urgent|give me (\w+ )?update)/i;
  if (briefPattern.test(userMessage.trim())) {
    userMessage = `${userMessage}\n\n[INSTRUCTION: Provide a BRIEF, CEO-optimized summary. Maximum 4-5 bullet points. Focus ONLY on: 1) Most critical item requiring action within 24h, 2) One key blind spot, 3) One quick win opportunity. Keep each point to 1-2 sentences. No lengthy explanations.]`;
  }
  
  // Format all communication context
  const contextPrompt = formatContextForLLM(context);
  
  // Check for hybrid mode
  const useHybrid = localStorage.getItem('use_hybrid_llm') === 'true';
  const useLocal = localStorage.getItem('use_local_llm') !== 'false';
  
  // Hybrid mode: route based on sensitivity
  if (useHybrid) {
    const isSensitive = isSensitiveQuery(userMessage);
    console.log(`🔄 Hybrid mode: Query classified as ${isSensitive ? 'SENSITIVE (using local)' : 'GENERAL (using cloud)'}`);
    
    if (isSensitive) {
      // Use local for sensitive queries
      const status = await localLLMService.checkStatus();
      if (status.running) {
        try {
          console.log('🔒 Using local LLM for sensitive query...');
          const companyContext = await companyService.buildCompanyContext();
          const fullContext = companyContext 
            ? formatCompanyContext(companyContext) + '\n\n' + contextPrompt + '\n\n' + userMessage
            : contextPrompt + '\n\n' + userMessage;
          
          const response = await localLLMService.generateResponse(fullContext, AGI_STRATEGIC_PROMPT);
          return {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: response,
            timestamp: new Date(),
            metadata: {
              privacy: 'local',
              mode: 'hybrid-sensitive',
            },
          };
        } catch (error: any) {
          return {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: `❌ Local LLM unavailable for sensitive query.\n\n${error.message}`,
            timestamp: new Date(),
          };
        }
      } else {
        return {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: 'Local LLM required for sensitive queries in Hybrid mode.\n\nPlease:\n1. Install Ollama from https://ollama.ai\n2. Run: ollama pull llama3.1:70b\n3. Or switch to Cloud API Only in Settings',
          timestamp: new Date(),
        };
      }
    }
    // For non-sensitive queries in hybrid mode, continue to cloud API below
    console.log('☁️ Using cloud API for general query...');
  }
  
  // Local-only mode
  if (useLocal && !useHybrid) {
    const status = await localLLMService.checkStatus();
    if (status.running) {
      try {
        console.log('🔒 Using local LLM...');
        const companyContext = await companyService.buildCompanyContext();
        const fullContext = companyContext 
          ? formatCompanyContext(companyContext) + '\n\n' + contextPrompt + '\n\n' + userMessage
          : contextPrompt + '\n\n' + userMessage;
        
        const response = await localLLMService.generateResponse(fullContext, AGI_STRATEGIC_PROMPT);
        return {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          metadata: {
            privacy: 'local',
            mode: 'local-only',
          },
        };
      } catch (error: any) {
        console.error('Local LLM failed:', error);
        return {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `❌ Local LLM Error\n\n${error.message}`,
          timestamp: new Date(),
        };
      }
    } else {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Local LLM not available.\n\nPlease:\n1. Install Ollama from https://ollama.ai\n2. Run: ollama pull llama3.1:70b\n3. Or enable Cloud API in Settings',
        timestamp: new Date(),
      };
    }
  }
  
  // Cloud API mode (default fallback)
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  
  if (!apiKey || apiKey === 'placeholder-using-local-llm') {
    console.error('VITE_ANTHROPIC_API_KEY is not set in environment variables');
    console.error('Available env vars:', Object.keys(import.meta.env));
    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: 'Configuration Error: VITE_ANTHROPIC_API_KEY not found in .env file.\n\nPlease ensure:\n1. .env file exists in the root directory\n2. Contains: VITE_ANTHROPIC_API_KEY=sk-ant-...\n3. Restart the dev server after adding the key (Ctrl+C then npm run dev)\n\nOr use Local LLM instead:\n1. Install Ollama from https://ollama.ai\n2. Enable Local LLM in Settings',
      timestamp: new Date(),
    };
  }
  
  try {
    console.log('🚀 Calling Claude API directly with fetch...');
    console.log('📊 Context size:', contextPrompt.length, 'characters');
    
    console.log('📡 Sending request to Claude API...');
    const startTime = Date.now();

    // Use proxy to avoid CORS issues
    const response = await fetch('/api/claude/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-dangerous-direct-browser-access': 'true', // Required for browser requests
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.7,
        system: CEO_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${contextPrompt}\n\n---\n\nCEO Question: ${userMessage}`,
          },
        ],
      }),
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ Response received in ${elapsed}ms`);
    console.log('📦 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }
    
    const message = await response.json();
    console.log('📦 Full API response structure:', JSON.stringify(message, null, 2));

    // Safe content extraction with proper error handling
    let responseContent = '';
    let debugInfo = '';
    
    console.log('🔍 Debugging content extraction:');
    console.log('  - message exists:', !!message);
    console.log('  - message.content exists:', !!message.content);
    console.log('  - message.content is array:', Array.isArray(message.content));
    console.log('  - message.content length:', message.content?.length);
    
    // Build debug info for UI display
    debugInfo += `\n🔍 Debug Info:\n`;
    debugInfo += `- API Response received: ✅\n`;
    debugInfo += `- Response time: ${elapsed}ms\n`;
    debugInfo += `- message exists: ${!!message}\n`;
    debugInfo += `- message.content exists: ${!!message.content}\n`;
    debugInfo += `- message.content is array: ${Array.isArray(message.content)}\n`;
    debugInfo += `- message.content length: ${message.content?.length || 0}\n`;
    
    if (message.content && Array.isArray(message.content) && message.content.length > 0) {
      const firstContent = message.content[0];
      console.log('  - firstContent type:', firstContent?.type);
      console.log('  - firstContent has text:', !!firstContent?.text);
      
      debugInfo += `- firstContent type: ${firstContent?.type}\n`;
      debugInfo += `- firstContent has text: ${!!firstContent?.text}\n`;
      
      if (firstContent && firstContent.type === 'text' && firstContent.text) {
        responseContent = firstContent.text;
        console.log('✅ Successfully extracted response text');
        debugInfo += `- ✅ Text extracted successfully!\n`;
      } else {
        console.warn('⚠️ Content exists but not in expected format');
        console.warn('  firstContent:', JSON.stringify(firstContent));
        debugInfo += `- ⚠️ Content format unexpected\n`;
        debugInfo += `- firstContent: ${JSON.stringify(firstContent, null, 2)}\n`;
        responseContent = `No response - Content format issue.\n${debugInfo}`;
      }
    } else {
      console.error('❌ Content array is empty or missing');
      console.error('  message.content:', message.content);
      debugInfo += `- ❌ Content array empty or missing\n`;
      debugInfo += `- message.content: ${JSON.stringify(message.content, null, 2)}\n`;
      debugInfo += `- Full message: ${JSON.stringify(message, null, 2)}\n`;
      responseContent = `No response - Empty content array.\n${debugInfo}`;
    }

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
      metadata: {
        sources: ['Teams', 'Email', 'Calendar'],
      },
    };
  } catch (error) {
    console.error('❌ CEO AI Service Error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown',
      type: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
    
    // Check if it's a CORS error
    const errorMsg = error instanceof Error ? error.message : String(error);
    let troubleshootingMsg = '';
    
    if (errorMsg.includes('CORS') || errorMsg.includes('Access-Control') || errorMsg.includes('Failed to fetch')) {
      troubleshootingMsg = `\n\n🔧 CORS Issue Detected:\nThe browser is blocking the request to Claude API.\n\nThis happens because:\n- Direct API calls from browser to Claude are blocked by CORS policy\n- You need a backend proxy server to make Claude API calls\n\n✅ Solution: Use Local LLM instead:\n1. Go to Settings → LLM Selection\n2. Select "Local Only"\n3. Install Ollama if not already installed`;
    } else {
      troubleshootingMsg = `\n\nTroubleshooting:\n1. Check browser console (F12) for detailed error\n2. Verify .env file has correct API key\n3. Restart dev server (Ctrl+C then npm run dev)\n4. Check Anthropic API status: https://status.anthropic.com\n\nFull error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`;
    }
    
    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `Error connecting to Claude AI: ${errorMsg}${troubleshootingMsg}`,
      timestamp: new Date(),
    };
  }
}

/**
 * Generate daily strategic briefing
 */
export async function generateDailyBriefing(context: CEOContext): Promise<Message> {
  const useLocal = await shouldUseLocalLLM();
  
  if (useLocal) {
    try {
      const companyContext = await companyService.buildCompanyContext();
      const contextString = companyContext 
        ? formatCompanyContext(companyContext) + '\n\n' + formatContextForLLM(context)
        : formatContextForLLM(context);
      
      const briefingContent = await localLLMService.generateDailyBriefing(contextString);
      
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: briefingContent,
        timestamp: new Date(),
        metadata: {
          type: 'daily-briefing',
          privacy: 'local',
        },
      };
    } catch (error: any) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Local LLM Error\n\n${error.message}`,
        timestamp: new Date(),
      };
    }
  }
  
  // Fallback to cloud
  return await generateCEOResponse(
    'Give me my strategic briefing for today. What are my top priorities, what ground truth should I know, and what clarifications do I need to get?',
    context
  );
}

/**
 * Analyze specific issue
 */
export async function analyzeStrategicIssue(
  issue: string,
  context: CEOContext
): Promise<Message> {
  return await generateCEOResponse(
    `Analyze this issue: ${issue}. What's the ground truth? What clarifications do I need? What should I do?`,
    context
  );
}

/**
 * Get clarification strategy for ambiguous situations
 */
export async function getClarificationStrategy(
  ambiguousSituation: string,
  context: CEOContext
): Promise<Message> {
  return await generateCEOResponse(
    `I'm seeing conflicting or ambiguous information about: ${ambiguousSituation}. Help me develop a strategy to get clarity. What questions should I ask, who should I talk to, and in what order?`,
    context
  );
}

/**
 * Generate a friendly greeting response based on time of day
 */
function generateGreetingResponse(): Message {
  const hour = new Date().getHours();
  let timeOfDay = 'day';
  let greeting = 'Hello';
  
  if (hour < 12) {
    timeOfDay = 'morning';
    greeting = 'Good morning';
  } else if (hour < 17) {
    timeOfDay = 'afternoon';
    greeting = 'Good afternoon';
  } else {
    timeOfDay = 'evening';
    greeting = 'Good evening';
  }
  
  const activeCompanies = companyService.getActiveCompanies();
  const companyContext = activeCompanies.length > 0 
    ? ` I'm monitoring ${activeCompanies.map(c => c.name).join(', ')} for you.`
    : '';
  
  const responses = [
    `${greeting}! How are you this ${timeOfDay}?${companyContext}\n\nWhat can I help you with today? I can:\n\n• **Analyze** your emails, Teams chats, and communications\n• **Identify** conflicts or issues across teams\n• **Provide** strategic insights and recommendations\n• **Answer** questions about your companies and operations\n• **Brief** you on priorities and action items\n\nJust let me know what you need!`,
    
    `${greeting}! I hope you're having a productive ${timeOfDay}.${companyContext}\n\nI'm your strategic intelligence advisor, ready to help you:\n\n• **Cut through** the noise in your communications\n• **Surface** critical issues that need your attention\n• **Provide** strategic guidance and clarification strategies\n• **Answer** any questions about your business\n• **Generate** briefings and summaries\n\nWhat would you like to focus on?`,
    
    `${greeting}! Great to hear from you this ${timeOfDay}!${companyContext}\n\nAs your AI strategic advisor, I'm here to:\n\n• **Monitor** and analyze organization-wide communications\n• **Detect** cross-team conflicts and strategic opportunities\n• **Provide** actionable insights and recommendations\n• **Help** you stay ahead of issues before they escalate\n• **Answer** your strategic questions\n\nWhat can I assist you with today?`
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  return {
    id: `msg-${Date.now()}`,
    role: 'assistant',
    content: randomResponse,
    timestamp: new Date(),
    metadata: {
      type: 'greeting',
    },
  };
}

/**
 * Determine if we should use local LLM based on user settings
 */
async function shouldUseLocalLLM(): Promise<boolean> {
  const useLocal = localStorage.getItem('use_local_llm') !== 'false';
  if (!useLocal) return false;
  
  const status = await localLLMService.checkStatus();
  return status.running;
}

/**
 * Determine if a query contains sensitive company information
 * Used in hybrid mode to route to local vs cloud LLM
 */
function isSensitiveQuery(message: string): boolean {
  const sensitivePhrases = [
    'email', 'teams chat', 'slack', 'discord',
    'financial', 'revenue', 'profit', 'budget', 'salary', 'compensation',
    'conflict', 'issue', 'problem', 'dispute',
    'confidential', 'private', 'internal',
    'strategy', 'roadmap', 'acquisition', 'merger',
    'competitor', 'competitive',
    'employee', 'personnel', 'team member',
    'project', 'initiative', 'launch',
    'othain', 'strivio', 'jersey technology'
  ];
  
  const lowerMessage = message.toLowerCase();
  return sensitivePhrases.some(phrase => lowerMessage.includes(phrase));
}
