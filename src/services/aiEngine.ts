/**
 * AI Strategic Analysis Engine
 * Provides intelligent analysis, priority detection, pattern recognition, and strategic insights
 */

import {
  PriorityScore,
  ActionItem,
  Pattern,
  StrategicInsight,
  Insight,
  Priority,
} from '../types';
import {
  syntheticTeamsMessages,
  syntheticOutlookEmails,
  syntheticWhatsAppMessages,
  syntheticGmailEmails,
  syntheticCalendarEvents,
  TeamsMessage,
  OutlookEmail,
  WhatsAppMessage,
  GmailEmail,
  CalendarEvent,
} from './syntheticData';
import {
  scoreTeamsMessage,
  scoreOutlookEmail,
  scoreWhatsAppMessage,
  scoreCalendarEvent,
} from '../utils/priorityScoring';
import {
  extractActionsFromTeams,
  extractActionsFromOutlook,
  extractActionsFromWhatsApp,
  consolidateActions,
} from '../utils/actionExtractor';

/**
 * Analyze all messages and generate priority scores
 */
export const analyzePriorities = (): {
  scores: PriorityScore[];
  topPriorities: Priority[];
} => {
  const scores: PriorityScore[] = [];

  // Score Teams messages
  syntheticTeamsMessages.forEach(msg => {
    scores.push(scoreTeamsMessage(msg));
  });

  // Score Outlook emails
  syntheticOutlookEmails.forEach(email => {
    scores.push(scoreOutlookEmail(email));
  });

  // Score WhatsApp messages
  syntheticWhatsAppMessages.forEach(msg => {
    scores.push(scoreWhatsAppMessage(msg));
  });

  // Score Calendar events
  syntheticCalendarEvents.forEach(event => {
    scores.push(scoreCalendarEvent(event));
  });

  // Sort by overall score
  scores.sort((a, b) => b.overallScore - a.overallScore);

  // Convert top scores to Priority objects
  const topPriorities = scores.slice(0, 10).map((score, index) => {
    const message = findMessageById(score.messageId);
    return messageToPriority(message, score, index);
  });

  return { scores, topPriorities };
};

/**
 * Find message by ID across all channels
 */
const findMessageById = (id: string): any => {
  const teams = syntheticTeamsMessages.find(m => m.id === id);
  if (teams) return { type: 'teams', data: teams };

  const outlook = syntheticOutlookEmails.find(e => e.id === id);
  if (outlook) return { type: 'outlook', data: outlook };

  const whatsapp = syntheticWhatsAppMessages.find(m => m.id === id);
  if (whatsapp) return { type: 'whatsapp', data: whatsapp };

  const calendar = syntheticCalendarEvents.find(e => e.id === id);
  if (calendar) return { type: 'calendar', data: calendar };

  return null;
};

/**
 * Convert message to Priority object
 */
const messageToPriority = (message: any, score: PriorityScore, index: number): Priority => {
  if (!message) {
    return {
      id: `priority-${index}`,
      title: 'Unknown Item',
      description: 'Could not retrieve details',
      priority: 'medium',
      source: 'Unknown',
      completed: false,
    };
  }

  const { type, data } = message;

  switch (type) {
    case 'teams':
      return {
        id: data.id,
        title: `${data.channel}: ${data.content.substring(0, 60)}...`,
        description: data.content,
        priority: data.priority,
        source: `Teams - ${data.channel}`,
        completed: false,
      };

    case 'outlook':
      return {
        id: data.id,
        title: data.subject,
        description: data.body.substring(0, 200) + '...',
        priority: data.priority,
        source: `Email from ${data.from.split('<')[0].trim()}`,
        completed: false,
      };

    case 'whatsapp':
      return {
        id: data.id,
        title: `WhatsApp - ${data.chatName}`,
        description: data.content,
        priority: data.priority,
        source: `WhatsApp - ${data.chatName}`,
        completed: false,
      };

    case 'calendar':
      const timeUntil = Math.round((data.startTime.getTime() - Date.now()) / (1000 * 60 * 60));
      return {
        id: data.id,
        title: data.title,
        description: `${data.description}\n\nStarts in ${timeUntil} hours`,
        priority: data.priority,
        source: 'Calendar',
        dueDate: data.startTime,
        completed: false,
      };

    default:
      return {
        id: `priority-${index}`,
        title: 'Unknown Item',
        description: 'Could not retrieve details',
        priority: 'medium',
        source: 'Unknown',
        completed: false,
      };
  }
};

/**
 * Extract all action items from messages
 */
export const extractAllActionItems = (): ActionItem[] => {
  const actions: ActionItem[] = [];

  // Extract from Teams
  syntheticTeamsMessages.forEach(msg => {
    actions.push(...extractActionsFromTeams(msg));
  });

  // Extract from Outlook
  syntheticOutlookEmails.forEach(email => {
    actions.push(...extractActionsFromOutlook(email));
  });

  // Extract from WhatsApp
  syntheticWhatsAppMessages.forEach(msg => {
    actions.push(...extractActionsFromWhatsApp(msg));
  });

  return consolidateActions(actions);
};

/**
 * Detect patterns across communications
 */
export const detectPatterns = (): Pattern[] => {
  const patterns: Pattern[] = [];
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Pattern 1: Communication spike detection
  const recentTeamsMessages = syntheticTeamsMessages.filter(m => m.timestamp > weekAgo);
  if (recentTeamsMessages.length > 15) {
    patterns.push({
      id: 'pattern-comm-spike',
      type: 'communication_spike',
      description: `${recentTeamsMessages.length} Teams messages in the past week, 40% above average`,
      frequency: recentTeamsMessages.length,
      affectedChannels: ['Teams'],
      timeframe: { start: weekAgo, end: now },
      recommendation: 'Consider batching responses or setting communication boundaries',
    });
  }

  // Pattern 2: Recurring topics
  const financeMessages = syntheticTeamsMessages.filter(m => 
    m.channel === 'Finance' || m.content.toLowerCase().includes('budget')
  );
  if (financeMessages.length >= 3) {
    patterns.push({
      id: 'pattern-finance-focus',
      type: 'recurring_topic',
      description: 'Finance and budget discussions are recurring theme this week',
      frequency: financeMessages.length,
      affectedChannels: ['Teams', 'Email'],
      timeframe: { start: weekAgo, end: now },
      recommendation: 'Block time for comprehensive budget review session',
    });
  }

  // Pattern 3: Client communication intensity
  const clientEmails = syntheticOutlookEmails.filter(e => 
    e.from.toLowerCase().includes('acme') || 
    e.from.toLowerCase().includes('techstart') ||
    e.from.toLowerCase().includes('globalcorp')
  );
  if (clientEmails.length >= 3) {
    patterns.push({
      id: 'pattern-client-intensity',
      type: 'recurring_topic',
      description: 'High volume of client communications requiring attention',
      frequency: clientEmails.length,
      affectedChannels: ['Email', 'WhatsApp'],
      timeframe: { start: weekAgo, end: now },
      recommendation: 'Consider delegating routine client communications to account managers',
    });
  }

  // Pattern 4: Meeting heavy schedule
  const upcomingMeetings = syntheticCalendarEvents.filter(e => 
    e.startTime.getTime() > now.getTime()
  );
  if (upcomingMeetings.length >= 8) {
    patterns.push({
      id: 'pattern-meeting-heavy',
      type: 'workload_imbalance',
      description: `${upcomingMeetings.length} meetings scheduled this week`,
      frequency: upcomingMeetings.length,
      affectedChannels: ['Calendar'],
      timeframe: { start: now, end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      recommendation: 'Block focus time between meetings for deep work',
    });
  }

  return patterns;
};

/**
 * Generate strategic insights
 */
export const generateStrategicInsights = (): StrategicInsight[] => {
  const insights: StrategicInsight[] = [];
  const now = new Date();
  const { topPriorities } = analyzePriorities();
  const actions = extractAllActionItems();

  // Insight 1: Time management
  const urgentItems = topPriorities.filter(p => p.priority === 'urgent').length;
  if (urgentItems >= 2) {
    insights.push({
      id: 'insight-time-mgmt',
      category: 'time_management',
      title: 'Multiple Urgent Items Require Immediate Attention',
      description: `You have ${urgentItems} urgent items requiring immediate action. Consider time-blocking your calendar.`,
      reasoning: 'Urgent items compete for attention and can lead to context switching. Dedicated time blocks improve focus and completion rate.',
      actionableSteps: [
        'Block next 2 hours for urgent items only',
        'Reschedule non-critical meetings if possible',
        'Notify team of limited availability',
        'Focus on one urgent item at a time',
      ],
      expectedImpact: 'high',
      timeToImplement: '30 minutes',
    });
  }

  // Insight 2: Delegation opportunities
  const actionableItems = actions.filter(a => !a.completed);
  if (actionableItems.length >= 10) {
    insights.push({
      id: 'insight-delegation',
      category: 'delegation',
      title: 'High Action Item Volume - Delegation Recommended',
      description: `${actionableItems.length} action items identified. Consider delegating routine tasks to free up strategic time.`,
      reasoning: 'As a leader, focusing on high-impact strategic work creates more value than handling all operational tasks.',
      actionableSteps: [
        'Review action items for delegation potential',
        'Identify tasks that team members can own',
        'Provide context and authority for delegation',
        'Set up check-in cadence for delegated items',
      ],
      expectedImpact: 'high',
      timeToImplement: '1 hour',
    });
  }

  // Insight 3: Focus areas
  const hasClientIssues = syntheticOutlookEmails.some(e => 
    e.priority === 'urgent' && (e.from.toLowerCase().includes('client') || e.from.toLowerCase().includes('customer'))
  );
  if (hasClientIssues) {
    insights.push({
      id: 'insight-client-focus',
      category: 'focus_areas',
      title: 'Client Issues Require Priority Focus',
      description: 'Multiple urgent client communications detected. Customer satisfaction should be top priority.',
      reasoning: 'Unresolved client issues can escalate quickly and impact retention and revenue. Immediate response builds trust.',
      actionableSteps: [
        'Respond to urgent client emails within 1 hour',
        'Schedule client calls to understand issues deeply',
        'Assign engineering resources to resolve technical blockers',
        'Provide proactive updates on resolution progress',
      ],
      expectedImpact: 'high',
      timeToImplement: 'Immediate',
    });
  }

  // Insight 4: Meeting prep
  const meetingsNeedingPrep = syntheticCalendarEvents.filter(e => 
    e.requiresPrep && e.startTime.getTime() > now.getTime() && e.startTime.getTime() < now.getTime() + 48 * 60 * 60 * 1000
  );
  if (meetingsNeedingPrep.length >= 2) {
    insights.push({
      id: 'insight-meeting-prep',
      category: 'time_management',
      title: 'Critical Meetings Require Preparation',
      description: `${meetingsNeedingPrep.length} high-priority meetings need preparation in the next 48 hours.`,
      reasoning: 'Proper preparation increases meeting effectiveness and demonstrates leadership. Unprepared meetings waste team time.',
      actionableSteps: meetingsNeedingPrep.map(m => `Prepare for: ${m.title}`),
      expectedImpact: 'high',
      timeToImplement: '2-3 hours',
    });
  }

  // Insight 5: Risk identification
  const overdueOrCritical = topPriorities.filter(p => 
    p.priority === 'urgent' && p.source.toLowerCase().includes('ceo')
  );
  if (overdueOrCritical.length > 0) {
    insights.push({
      id: 'insight-exec-risk',
      category: 'risk',
      title: 'Executive-Level Items Need Immediate Attention',
      description: 'CEO or C-level executives are waiting for your input on critical matters.',
      reasoning: 'Executive requests typically have high business impact and visibility. Delays can affect strategic decisions.',
      actionableSteps: [
        'Prioritize executive requests above operational tasks',
        'Provide status updates even if final deliverable is not ready',
        'Escalate any blockers immediately',
        'Schedule time to complete executive requests today',
      ],
      expectedImpact: 'high',
      timeToImplement: 'Immediate',
    });
  }

  return insights;
};

/**
 * Generate AI insights for dashboard
 */
export const generateInsights = (): Insight[] => {
  const insights: Insight[] = [];
  const now = new Date();
  const patterns = detectPatterns();
  const { topPriorities } = analyzePriorities();

  // Insight 1: Communication volume
  const totalMessages = syntheticTeamsMessages.length + 
                       syntheticOutlookEmails.length + 
                       syntheticWhatsAppMessages.length;
  insights.push({
    id: 'insight-volume',
    type: 'alert',
    title: 'High Communication Volume Today',
    description: `You have ${totalMessages} messages across all channels. ${topPriorities.filter(p => p.priority === 'urgent').length} require urgent attention.`,
    channels: ['Teams', 'Email', 'WhatsApp'],
    timestamp: now,
    priority: 'high',
    actionable: true,
  });

  // Insight 2: VIP communication
  const vipMessages = syntheticTeamsMessages.filter(m => 
    m.sender.toLowerCase().includes('ceo') || 
    m.sender.toLowerCase().includes('cto') || 
    m.sender.toLowerCase().includes('cfo')
  );
  if (vipMessages.length > 0) {
    insights.push({
      id: 'insight-vip',
      type: 'alert',
      title: 'Executive Team Activity',
      description: `${vipMessages.length} messages from C-level executives require your attention.`,
      channels: ['Teams', 'Email'],
      timestamp: now,
      priority: 'urgent',
      actionable: true,
    });
  }

  // Insight 3: Upcoming deadlines
  const urgentCalendar = syntheticCalendarEvents.filter(e => 
    e.startTime.getTime() > now.getTime() && 
    e.startTime.getTime() < now.getTime() + 4 * 60 * 60 * 1000
  );
  if (urgentCalendar.length > 0) {
    insights.push({
      id: 'insight-calendar',
      type: 'alert',
      title: 'Meetings Starting Soon',
      description: `${urgentCalendar.length} meetings starting in the next 4 hours. ${urgentCalendar.filter(e => e.requiresPrep).length} require preparation.`,
      channels: ['Calendar'],
      timestamp: now,
      priority: 'high',
      actionable: true,
    });
  }

  // Insight 4: Pattern-based suggestions
  if (patterns.length > 0) {
    const topPattern = patterns[0];
    insights.push({
      id: 'insight-pattern',
      type: 'trend',
      title: topPattern.description,
      description: topPattern.recommendation || 'Consider adjusting your workflow.',
      channels: topPattern.affectedChannels,
      timestamp: now,
      priority: 'medium',
      actionable: true,
    });
  }

  // Insight 5: Strategic recommendation
  insights.push({
    id: 'insight-strategy',
    type: 'suggestion',
    title: 'Recommended Focus for Next 2 Hours',
    description: 'Based on urgency and impact: 1) Address production issues, 2) Prepare for Q1 budget meeting, 3) Respond to client communications.',
    channels: ['Teams', 'Email', 'Calendar'],
    timestamp: now,
    priority: 'high',
    actionable: true,
  });

  return insights;
};

/**
 * Get daily briefing summary
 */
export const getDailyBriefing = (): string => {
  const { topPriorities } = analyzePriorities();
  const actions = extractAllActionItems();
  const insights = generateStrategicInsights();
  const urgentCount = topPriorities.filter(p => p.priority === 'urgent').length;
  const highCount = topPriorities.filter(p => p.priority === 'high').length;

  let briefing = '# Daily Briefing\n\n';
  briefing += `Good morning! Here's your strategic overview for today.\n\n`;

  // Priority summary
  briefing += `## 📊 Priority Overview\n\n`;
  briefing += `- **${urgentCount}** urgent items requiring immediate attention\n`;
  briefing += `- **${highCount}** high-priority items\n`;
  briefing += `- **${actions.length}** action items identified\n`;
  briefing += `- **${syntheticCalendarEvents.filter(e => e.startTime.getTime() > Date.now()).length}** meetings scheduled\n\n`;

  // Top 3 priorities
  briefing += `## 🎯 Top 3 Priorities\n\n`;
  topPriorities.slice(0, 3).forEach((priority, i) => {
    const emoji = priority.priority === 'urgent' ? '🔴' : priority.priority === 'high' ? '🟠' : '🟡';
    briefing += `${i + 1}. ${emoji} **${priority.title}**\n`;
    briefing += `   - ${priority.description.substring(0, 100)}...\n`;
    briefing += `   - Source: ${priority.source}\n\n`;
  });

  // Strategic insights
  if (insights.length > 0) {
    briefing += `## 💡 Strategic Insights\n\n`;
    insights.slice(0, 2).forEach(insight => {
      briefing += `### ${insight.title}\n`;
      briefing += `${insight.description}\n\n`;
      if (insight.actionableSteps && insight.actionableSteps.length > 0) {
        briefing += `**Recommended actions:**\n`;
        insight.actionableSteps.slice(0, 3).forEach(step => {
          briefing += `- ${step}\n`;
        });
        briefing += `\n`;
      }
    });
  }

  // Recommended schedule
  briefing += `## ⏰ Recommended Schedule\n\n`;
  briefing += `1. **Next 1-2 hours**: Address urgent production issues and client blockers\n`;
  briefing += `2. **Late morning**: Prepare for Q1 budget review meeting\n`;
  briefing += `3. **Afternoon**: Attend scheduled meetings and provide strategic input\n`;
  briefing += `4. **End of day**: Review progress and plan for tomorrow\n\n`;

  briefing += `Let me know if you'd like me to dive deeper into any of these items! 🚀`;

  return briefing;
};

/**
 * AI Engine initialization
 */
export const initializeAIEngine = () => {
  console.log('🧠 AI Strategic Engine initialized');
  console.log(`📊 Analyzing ${syntheticTeamsMessages.length} Teams messages`);
  console.log(`📧 Analyzing ${syntheticOutlookEmails.length} Outlook emails`);
  console.log(`💬 Analyzing ${syntheticWhatsAppMessages.length} WhatsApp messages`);
  console.log(`📅 Analyzing ${syntheticCalendarEvents.length} calendar events`);
  
  const { topPriorities } = analyzePriorities();
  const actions = extractAllActionItems();
  const patterns = detectPatterns();
  const insights = generateStrategicInsights();
  
  console.log(`✅ Found ${topPriorities.length} priority items`);
  console.log(`✅ Extracted ${actions.length} action items`);
  console.log(`✅ Detected ${patterns.length} communication patterns`);
  console.log(`✅ Generated ${insights.length} strategic insights`);
};
