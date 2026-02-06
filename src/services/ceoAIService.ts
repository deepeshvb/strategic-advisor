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
 * Generate CEO-focused strategic response using Claude 3.5 Sonnet
 */
export async function generateCEOResponse(
  userMessage: string,
  context: CEOContext
): Promise<Message> {
  
  // Format all communication context
  const contextPrompt = formatContextForLLM(context);
  
  // Validate API key
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('VITE_ANTHROPIC_API_KEY is not set in environment variables');
    console.error('Available env vars:', Object.keys(import.meta.env));
    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: 'Configuration Error: VITE_ANTHROPIC_API_KEY not found in .env file.\n\nPlease ensure:\n1. .env file exists in the root directory\n2. Contains: VITE_ANTHROPIC_API_KEY=sk-ant-...\n3. Restart the dev server after adding the key (Ctrl+C then npm run dev)',
      timestamp: new Date(),
    };
  }
  
  try {
    console.log('🚀 Initializing Claude Sonnet 4.5...');
    console.log('📊 Context size:', contextPrompt.length, 'characters');
    
    const anthropic = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Required for browser/Vite environments
    });

    console.log('📡 Sending request to Claude API...');
    const startTime = Date.now();

    const message = await anthropic.messages.create({
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
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ Response received in ${elapsed}ms`);

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: message.content[0].type === 'text' ? message.content[0].text : 'No response',
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
    });
    
    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `Error connecting to Claude AI: ${error instanceof Error ? error.message : JSON.stringify(error)}\n\nTroubleshooting:\n1. Check browser console (F12) for detailed error\n2. Verify .env file has correct API key\n3. Restart dev server (Ctrl+C then npm run dev)\n4. Check Anthropic API status: https://status.anthropic.com`,
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
