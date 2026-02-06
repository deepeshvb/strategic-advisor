/**
 * Voice API Endpoints for Siri Integration
 * 
 * These endpoints allow Siri to query the AGI and get spoken responses
 * without opening the app.
 */

import { Request, Response } from 'express';
import { monitoringService } from '../services/monitoringService';
import { AGI_STRATEGIC_PROMPT } from '../prompts/agi-strategic-prompt';

/**
 * Format response for voice (natural, conversational)
 */
function formatForVoice(text: string): string {
  // Remove markdown formatting
  let voice = text
    .replace(/#{1,6}\s/g, '') // Remove headers
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.+?)\*/g, '$1') // Remove italics
    .replace(/`(.+?)`/g, '$1') // Remove code blocks
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
    .replace(/[-*+]\s/g, '') // Remove bullet points
    .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
    .trim();
  
  return voice;
}

/**
 * GET /api/voice/critical
 * Returns critical items in voice-friendly format
 */
export async function getCriticalItems(req: Request, res: Response) {
  try {
    const items = monitoringService.getCriticalItems();
    
    if (items.length === 0) {
      return res.json({
        success: true,
        text: "No critical items detected. Everything looks good.",
        count: 0
      });
    }
    
    // Format for voice
    const summary = items.length === 1
      ? `You have 1 critical item requiring attention: ${items[0].title}`
      : `You have ${items.length} critical items requiring attention: ${items.map((item, i) => `${i + 1}. ${item.title}`).join('. ')}`;
    
    res.json({
      success: true,
      text: formatForVoice(summary),
      count: items.length,
      items: items.map(item => ({
        title: item.title,
        source: item.source,
        priority: item.priority,
        timestamp: item.timestamp
      }))
    });
  } catch (error) {
    console.error('Voice API - Critical items error:', error);
    res.status(500).json({
      success: false,
      text: "I encountered an error retrieving critical items. Please check the app."
    });
  }
}

/**
 * GET /api/voice/summary
 * Returns daily summary in voice-friendly format
 */
export async function getDailySummary(req: Request, res: Response) {
  try {
    const items = monitoringService.getAllItems();
    const critical = items.filter(i => i.priority === 'critical').length;
    const high = items.filter(i => i.priority === 'high').length;
    const medium = items.filter(i => i.priority === 'medium').length;
    
    let summary = `Here's your strategic summary. `;
    
    if (critical > 0) {
      summary += `${critical} critical ${critical === 1 ? 'item' : 'items'} requiring immediate attention. `;
    }
    
    if (high > 0) {
      summary += `${high} high priority ${high === 1 ? 'item' : 'items'}. `;
    }
    
    if (medium > 0) {
      summary += `${medium} medium priority ${medium === 1 ? 'item' : 'items'}. `;
    }
    
    if (critical === 0 && high === 0 && medium === 0) {
      summary = "Your strategic dashboard is clear. No urgent items detected.";
    }
    
    res.json({
      success: true,
      text: formatForVoice(summary),
      stats: {
        critical,
        high,
        medium,
        total: items.length
      }
    });
  } catch (error) {
    console.error('Voice API - Summary error:', error);
    res.status(500).json({
      success: false,
      text: "I encountered an error generating your summary."
    });
  }
}

/**
 * GET /api/voice/status
 * Returns current monitoring status
 */
export async function getStatus(req: Request, res: Response) {
  try {
    const status = monitoringService.getStatus();
    const lastRun = status.lastRun ? new Date(status.lastRun) : null;
    const minutesAgo = lastRun 
      ? Math.round((Date.now() - lastRun.getTime()) / 60000)
      : null;
    
    let text = `Monitoring is ${status.running ? 'active' : 'inactive'}. `;
    
    if (lastRun && minutesAgo !== null) {
      text += `Last scan was ${minutesAgo} ${minutesAgo === 1 ? 'minute' : 'minutes'} ago. `;
    }
    
    text += `Watching ${status.activeChannels || 0} channels.`;
    
    res.json({
      success: true,
      text: formatForVoice(text),
      status: {
        running: status.running,
        lastRun: status.lastRun,
        activeChannels: status.activeChannels
      }
    });
  } catch (error) {
    console.error('Voice API - Status error:', error);
    res.status(500).json({
      success: false,
      text: "I encountered an error checking system status."
    });
  }
}

/**
 * POST /api/voice/query
 * Process natural language query and return voice response
 */
export async function processQuery(req: Request, res: Response) {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        text: "I didn't receive a valid query. Please try again."
      });
    }
    
    // Get relevant context
    const items = monitoringService.getAllItems();
    const critical = items.filter(i => i.priority === 'critical');
    const high = items.filter(i => i.priority === 'high');
    
    // Simple query routing (can be enhanced with LLM)
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('critical') || lowerQuery.includes('urgent')) {
      return getCriticalItems(req, res);
    }
    
    if (lowerQuery.includes('summary') || lowerQuery.includes('overview') || lowerQuery.includes('update')) {
      return getDailySummary(req, res);
    }
    
    if (lowerQuery.includes('status') || lowerQuery.includes('running') || lowerQuery.includes('monitoring')) {
      return getStatus(req, res);
    }
    
    // Default response with context
    let response = `Based on current monitoring, `;
    
    if (critical.length > 0) {
      response += `you have ${critical.length} critical ${critical.length === 1 ? 'item' : 'items'}. `;
    } else if (high.length > 0) {
      response += `you have ${high.length} high priority ${high.length === 1 ? 'item' : 'items'}. `;
    } else {
      response += `everything looks good. `;
    }
    
    response += `For specific insights, try asking about critical items, summary, or status.`;
    
    res.json({
      success: true,
      text: formatForVoice(response),
      query: query
    });
  } catch (error) {
    console.error('Voice API - Query error:', error);
    res.status(500).json({
      success: false,
      text: "I encountered an error processing your query."
    });
  }
}

/**
 * GET /api/voice/briefing
 * Returns comprehensive morning/evening briefing
 */
export async function getBriefing(req: Request, res: Response) {
  try {
    const { type = 'morning' } = req.query;
    const items = monitoringService.getAllItems();
    const critical = items.filter(i => i.priority === 'critical');
    const high = items.filter(i => i.priority === 'high');
    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
    
    let briefing = '';
    
    if (type === 'morning') {
      briefing = `Good morning. Here's your briefing for ${today}. `;
    } else {
      briefing = `Good evening. Here's your end of day summary for ${today}. `;
    }
    
    // Critical items first
    if (critical.length > 0) {
      briefing += `You have ${critical.length} critical ${critical.length === 1 ? 'item' : 'items'} requiring immediate attention: `;
      critical.slice(0, 3).forEach((item, i) => {
        briefing += `${i + 1}. ${item.title}. `;
      });
      if (critical.length > 3) {
        briefing += `And ${critical.length - 3} more critical items. `;
      }
    }
    
    // High priority items
    if (high.length > 0) {
      briefing += `${high.length} high priority ${high.length === 1 ? 'item' : 'items'} to address today. `;
    }
    
    // All clear
    if (critical.length === 0 && high.length === 0) {
      briefing += `Your strategic dashboard is clear. Focus on your planned priorities.`;
    }
    
    res.json({
      success: true,
      text: formatForVoice(briefing),
      type: type,
      date: today,
      stats: {
        critical: critical.length,
        high: high.length,
        total: items.length
      }
    });
  } catch (error) {
    console.error('Voice API - Briefing error:', error);
    res.status(500).json({
      success: false,
      text: "I encountered an error generating your briefing."
    });
  }
}
