/**
 * Voice Response Service
 * Formats monitoring data and insights for voice/speech output
 */

import { monitoringService } from './monitoringService';
import { AGI_STRATEGIC_PROMPT } from '../prompts/agi-strategic-prompt';

export interface VoiceResponse {
  text: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  timestamp: Date;
  itemCount?: number;
}

class VoiceResponseService {
  /**
   * Get critical items formatted for voice
   */
  async getCriticalItemsVoice(): Promise<VoiceResponse> {
    const items = await monitoringService.getCriticalItems();
    
    if (items.length === 0) {
      return {
        text: "You have no critical items requiring immediate attention. All systems are running smoothly.",
        priority: 'normal',
        timestamp: new Date(),
        itemCount: 0,
      };
    }

    if (items.length === 1) {
      const item = items[0];
      return {
        text: `You have 1 critical item: ${item.title}. ${item.summary || ''}. This requires immediate attention.`,
        priority: 'critical',
        timestamp: new Date(),
        itemCount: 1,
      };
    }

    // Multiple items - summarize top 3
    const topItems = items.slice(0, 3);
    const itemsList = topItems.map((item, idx) => 
      `${idx + 1}. ${item.title}.`
    ).join(' ');
    
    const extraCount = items.length - 3;
    const extraText = extraCount > 0 ? ` Plus ${extraCount} additional critical ${extraCount === 1 ? 'item' : 'items'}.` : '';
    
    return {
      text: `You have ${items.length} critical items requiring attention. ${itemsList}${extraText}`,
      priority: 'critical',
      timestamp: new Date(),
      itemCount: items.length,
    };
  }

  /**
   * Get daily summary formatted for voice
   */
  async getDailySummaryVoice(): Promise<VoiceResponse> {
    const summary = await monitoringService.getDailySummary();
    
    const criticalCount = summary.critical || 0;
    const highCount = summary.high || 0;
    const totalCount = summary.total || 0;
    
    let text = `Good morning. Here's your strategic briefing. `;
    
    if (criticalCount > 0) {
      text += `You have ${criticalCount} critical ${criticalCount === 1 ? 'item' : 'items'} requiring immediate attention. `;
    }
    
    if (highCount > 0) {
      text += `${highCount} high-priority ${highCount === 1 ? 'item' : 'items'} for today. `;
    }
    
    if (criticalCount === 0 && highCount === 0) {
      text += `No urgent items detected. `;
    }
    
    text += `Total items being monitored: ${totalCount}. `;
    
    // Add top priority if available
    if (summary.topPriority) {
      text += `Your top priority: ${summary.topPriority}.`;
    }
    
    return {
      text,
      priority: criticalCount > 0 ? 'critical' : highCount > 0 ? 'high' : 'normal',
      timestamp: new Date(),
      itemCount: totalCount,
    };
  }

  /**
   * Get current status formatted for voice
   */
  async getStatusVoice(): Promise<VoiceResponse> {
    const status = await monitoringService.getSystemStatus();
    
    const activeCompanies = status.companies?.active || 0;
    const lastUpdate = status.lastUpdate ? new Date(status.lastUpdate) : null;
    const minutesSinceUpdate = lastUpdate 
      ? Math.floor((Date.now() - lastUpdate.getTime()) / 60000)
      : null;
    
    let text = `System status: `;
    
    if (status.monitoring) {
      text += `Monitoring is active. `;
    } else {
      text += `Warning: Monitoring is not active. `;
    }
    
    text += `Tracking ${activeCompanies} ${activeCompanies === 1 ? 'company' : 'companies'}. `;
    
    if (minutesSinceUpdate !== null) {
      if (minutesSinceUpdate < 1) {
        text += `Last update: just now.`;
      } else if (minutesSinceUpdate < 60) {
        text += `Last update: ${minutesSinceUpdate} ${minutesSinceUpdate === 1 ? 'minute' : 'minutes'} ago.`;
      } else {
        const hours = Math.floor(minutesSinceUpdate / 60);
        text += `Last update: ${hours} ${hours === 1 ? 'hour' : 'hours'} ago.`;
      }
    }
    
    return {
      text,
      priority: status.monitoring ? 'normal' : 'high',
      timestamp: new Date(),
    };
  }

  /**
   * Process natural language query and return voice response
   */
  async processQueryVoice(query: string): Promise<VoiceResponse> {
    // Extract intent from query
    const lowerQuery = query.toLowerCase();
    
    // Critical items queries
    if (
      lowerQuery.includes('critical') ||
      lowerQuery.includes('urgent') ||
      lowerQuery.includes('important') ||
      lowerQuery.includes('immediate')
    ) {
      return this.getCriticalItemsVoice();
    }
    
    // Summary/briefing queries
    if (
      lowerQuery.includes('summary') ||
      lowerQuery.includes('briefing') ||
      lowerQuery.includes('update') ||
      lowerQuery.includes('overview')
    ) {
      return this.getDailySummaryVoice();
    }
    
    // Status queries
    if (
      lowerQuery.includes('status') ||
      lowerQuery.includes('running') ||
      lowerQuery.includes('working') ||
      lowerQuery.includes('monitoring')
    ) {
      return this.getStatusVoice();
    }
    
    // Today's focus
    if (
      lowerQuery.includes('today') ||
      lowerQuery.includes('focus') ||
      lowerQuery.includes('priority')
    ) {
      const summary = await this.getDailySummaryVoice();
      return {
        ...summary,
        text: summary.text.replace('Good morning. Here\'s your strategic briefing.', 'Here\'s what needs your attention today.'),
      };
    }
    
    // Default response with helpful info
    return {
      text: `I can help you with: critical items, daily summary, system status, or today's priorities. What would you like to know?`,
      priority: 'normal',
      timestamp: new Date(),
    };
  }

  /**
   * Format response for Siri (plain text)
   */
  formatForSiri(response: VoiceResponse): string {
    return response.text;
  }

  /**
   * Get proactive insight for scheduled announcements
   */
  async getProactiveInsightVoice(timeOfDay: 'morning' | 'midday' | 'evening'): Promise<VoiceResponse> {
    const summary = await monitoringService.getDailySummary();
    
    let text = '';
    
    switch (timeOfDay) {
      case 'morning':
        text = `Good morning. `;
        break;
      case 'midday':
        text = `Midday check-in. `;
        break;
      case 'evening':
        text = `End of day summary. `;
        break;
    }
    
    const criticalCount = summary.critical || 0;
    const highCount = summary.high || 0;
    
    if (criticalCount > 0) {
      text += `You have ${criticalCount} critical ${criticalCount === 1 ? 'item' : 'items'} requiring attention. `;
      if (timeOfDay === 'evening') {
        text += `These should be addressed before end of day. `;
      }
    } else if (highCount > 0) {
      text += `${highCount} high-priority ${highCount === 1 ? 'item' : 'items'} on your radar. `;
    } else {
      text += `No urgent items detected. `;
      if (timeOfDay === 'evening') {
        text += `You're all caught up. Good work today. `;
      }
    }
    
    return {
      text,
      priority: criticalCount > 0 ? 'critical' : highCount > 0 ? 'high' : 'normal',
      timestamp: new Date(),
      itemCount: criticalCount + highCount,
    };
  }
}

export const voiceResponseService = new VoiceResponseService();
