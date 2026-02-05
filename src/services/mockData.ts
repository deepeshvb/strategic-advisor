import { Channel, Priority, Insight, Message } from '../types';

export const mockChannels: Channel[] = [
  {
    id: 'email-1',
    name: 'Work Email',
    type: 'email',
    connected: true,
    lastSync: new Date(Date.now() - 5 * 60000),
    unreadCount: 12,
  },
  {
    id: 'teams-1',
    name: 'Microsoft Teams',
    type: 'teams',
    connected: true,
    lastSync: new Date(Date.now() - 2 * 60000),
    unreadCount: 5,
  },
  {
    id: 'slack-1',
    name: 'Slack Workspace',
    type: 'slack',
    connected: false,
    unreadCount: 0,
  },
  {
    id: 'calendar-1',
    name: 'Work Calendar',
    type: 'calendar',
    connected: true,
    lastSync: new Date(Date.now() - 10 * 60000),
  },
];

export const mockPriorities: Priority[] = [
  {
    id: 'p1',
    title: 'Q1 Budget Review Meeting',
    description: 'Sarah from Finance requested your input on Q1 budget allocation. Meeting scheduled for today at 2 PM.',
    priority: 'urgent',
    source: 'Teams',
    dueDate: new Date(Date.now() + 3 * 3600000),
    completed: false,
  },
  {
    id: 'p2',
    title: 'Client Proposal Response',
    description: 'Acme Corp is waiting for your proposal review. They mentioned timeline sensitivity in their last email.',
    priority: 'high',
    source: 'Email',
    dueDate: new Date(Date.now() + 24 * 3600000),
    completed: false,
  },
  {
    id: 'p3',
    title: 'Code Review - Authentication Module',
    description: 'Team needs your review on the new OAuth implementation before deployment.',
    priority: 'high',
    source: 'Teams',
    dueDate: new Date(Date.now() + 48 * 3600000),
    completed: false,
  },
  {
    id: 'p4',
    title: 'Monthly Report Compilation',
    description: 'Marketing team needs Q4 metrics for the monthly report.',
    priority: 'medium',
    source: 'Email',
    dueDate: new Date(Date.now() + 5 * 24 * 3600000),
    completed: false,
  },
  {
    id: 'p5',
    title: 'Team Building Event Planning',
    description: 'HR requested venue preferences for next month\'s team building event.',
    priority: 'low',
    source: 'Teams',
    dueDate: new Date(Date.now() + 14 * 24 * 3600000),
    completed: false,
  },
];

export const mockInsights: Insight[] = [
  {
    id: 'i1',
    type: 'alert',
    title: 'Increased Communication Volume',
    description: 'You\'ve received 40% more messages than usual today. Most are regarding the Q1 planning.',
    channels: ['Email', 'Teams'],
    timestamp: new Date(Date.now() - 30 * 60000),
  },
  {
    id: 'i2',
    type: 'trend',
    title: 'Recurring Meeting Pattern',
    description: 'Finance team has scheduled 3 meetings with you this week, more than usual.',
    channels: ['Calendar', 'Teams'],
    timestamp: new Date(Date.now() - 60 * 60000),
  },
  {
    id: 'i3',
    type: 'suggestion',
    title: 'Time Block Recommendation',
    description: 'Consider blocking 2-3 hours for deep work. You have multiple code reviews pending.',
    channels: ['Teams', 'Email'],
    timestamp: new Date(Date.now() - 90 * 60000),
  },
  {
    id: 'i4',
    type: 'summary',
    title: 'Key Stakeholders Active',
    description: 'Your top 5 stakeholders have all been active in the past hour.',
    channels: ['Email', 'Teams'],
    timestamp: new Date(Date.now() - 15 * 60000),
  },
];

export const generateAIResponse = (userMessage: string, context: any): Message => {
  const lowerMessage = userMessage.toLowerCase();
  
  let response = '';
  let sources: string[] = [];
  let priority: 'low' | 'medium' | 'high' | 'urgent' | undefined;

  if (lowerMessage.includes('priority') || lowerMessage.includes('urgent') || lowerMessage.includes('important')) {
    response = `Based on your communication channels, here are your top priorities for today:\n\n` +
      `🔴 **URGENT**: Q1 Budget Review Meeting at 2 PM - Sarah needs your input\n` +
      `🟠 **HIGH**: Client proposal response for Acme Corp (due tomorrow)\n` +
      `🟠 **HIGH**: Code review for authentication module\n\n` +
      `I recommend focusing on the budget meeting first since it's today, then addressing the client proposal this afternoon.`;
    sources = ['Email', 'Teams', 'Calendar'];
    priority = 'high';
  } else if (lowerMessage.includes('meeting') || lowerMessage.includes('calendar')) {
    response = `You have 4 meetings scheduled today:\n\n` +
      `• 10:00 AM - Team Standup (30 min)\n` +
      `• 2:00 PM - Q1 Budget Review with Finance (1 hour) ⚠️\n` +
      `• 3:30 PM - Client Call - Acme Corp (45 min)\n` +
      `• 4:30 PM - 1:1 with Direct Report (30 min)\n\n` +
      `The budget review is your most critical meeting today. Would you like me to prepare talking points?`;
    sources = ['Calendar', 'Teams'];
  } else if (lowerMessage.includes('email')) {
    response = `You have 12 unread emails. Here are the most important:\n\n` +
      `📧 From Sarah Chen (Finance): "Budget Review - Need Your Input" - Received 2 hours ago\n` +
      `📧 From Acme Corp: "Re: Proposal Timeline" - Received 1 hour ago\n` +
      `📧 From Marketing Team: "Q4 Metrics Request" - Received yesterday\n\n` +
      `The first two require immediate attention. Shall I help you draft responses?`;
    sources = ['Email'];
  } else if (lowerMessage.includes('team') || lowerMessage.includes('teams')) {
    response = `You have 5 unread Teams messages:\n\n` +
      `💬 Engineering Channel: Code review request for OAuth implementation\n` +
      `💬 Finance Team: Budget meeting prep materials shared\n` +
      `💬 Direct Message from Alex: Quick question about project timeline\n\n` +
      `The code review is time-sensitive as the team wants to deploy this week.`;
    sources = ['Teams'];
  } else if (lowerMessage.includes('help') || lowerMessage.includes('what can you')) {
    response = `I'm your strategic coworker! I monitor your communication channels and help you:\n\n` +
      `✅ Identify urgent items and priorities\n` +
      `✅ Summarize emails, Teams messages, and meetings\n` +
      `✅ Suggest optimal time allocation\n` +
      `✅ Track action items and deadlines\n` +
      `✅ Provide context before meetings\n` +
      `✅ Alert you to important trends\n\n` +
      `Try asking: "What are my priorities today?" or "Summarize my unread emails"`;
  } else if (lowerMessage.includes('focus') || lowerMessage.includes('work on')) {
    response = `Based on urgency and impact, I recommend this order:\n\n` +
      `1. **Next 2 hours**: Prepare for Q1 Budget Review meeting (2 PM today)\n` +
      `2. **After budget meeting**: Review and respond to Acme Corp proposal\n` +
      `3. **Tomorrow morning**: Complete code review for authentication module\n` +
      `4. **Later this week**: Compile Q4 metrics for marketing report\n\n` +
      `This sequence handles urgent items first while leaving buffer time for unexpected issues.`;
    sources = ['Email', 'Teams', 'Calendar'];
    priority = 'high';
  } else if (lowerMessage.includes('summarize') || lowerMessage.includes('summary')) {
    response = `**Daily Summary**\n\n` +
      `📊 **Communication Volume**: 40% above average\n` +
      `🔔 **Urgent Items**: 1 (Budget meeting)\n` +
      `📧 **Unread Emails**: 12 (2 critical)\n` +
      `💬 **Teams Messages**: 5 unread\n` +
      `📅 **Meetings Today**: 4 scheduled\n\n` +
      `**Key Theme**: Q1 planning activities are driving increased communication. Finance and stakeholder engagement are your top focus areas today.`;
    sources = ['Email', 'Teams', 'Calendar'];
  } else {
    response = `I've analyzed your communications across all channels. You currently have:\n\n` +
      `• 1 urgent priority (Q1 Budget Review)\n` +
      `• 2 high-priority items\n` +
      `• 12 unread emails\n` +
      `• 5 Teams messages\n` +
      `• 4 meetings scheduled\n\n` +
      `What would you like to focus on? I can help you prioritize, summarize specific channels, or provide meeting context.`;
    sources = ['Email', 'Teams', 'Calendar'];
  }

  return {
    id: `msg-${Date.now()}`,
    role: 'assistant',
    content: response,
    timestamp: new Date(),
    metadata: {
      sources: sources.length > 0 ? sources : undefined,
      priority,
    },
  };
};
