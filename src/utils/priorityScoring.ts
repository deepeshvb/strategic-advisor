/**
 * Priority Scoring Algorithm
 * Calculates urgency and impact scores for messages across all channels
 */

import { PriorityScore } from '../types';
import type { TeamsMessage, OutlookEmail, WhatsAppMessage, CalendarEvent } from '../services/syntheticData';

// VIP senders who should be prioritized
const VIP_SENDERS = [
  'jennifer brooks', 'ceo',
  'michael chen', 'cto',
  'robert singh', 'cfo',
  'karen white', // Manager
  'client', 'customer',
];

// Urgent keywords that indicate high priority
const URGENT_KEYWORDS = [
  'urgent', 'asap', 'critical', 'emergency', 'blocker', 'blocked',
  'immediately', 'deadline', 'eod', 'today', 'now', 'help',
  'issue', 'problem', 'down', 'error', 'failed', 'failure',
];

// Action keywords that indicate action items
const ACTION_KEYWORDS = [
  'review', 'approve', 'sign', 'respond', 'reply', 'feedback',
  'schedule', 'meeting', 'call', 'discuss', 'decision',
  'complete', 'finish', 'update', 'submit', 'send',
];

/**
 * Calculate urgency score (0-100) based on various factors
 */
export const calculateUrgencyScore = (message: {
  content: string;
  timestamp: Date;
  priority: string;
  dueDate?: Date;
  mentions?: string[];
}): number => {
  let score = 0;

  // Base urgency from explicit priority
  const priorityScores = {
    urgent: 40,
    high: 30,
    medium: 15,
    low: 5,
  };
  score += priorityScores[message.priority as keyof typeof priorityScores] || 10;

  // Check for urgent keywords
  const contentLower = message.content.toLowerCase();
  const urgentKeywordCount = URGENT_KEYWORDS.filter(kw => contentLower.includes(kw)).length;
  score += Math.min(urgentKeywordCount * 10, 30);

  // Time sensitivity - how old is the message?
  const hoursOld = (Date.now() - message.timestamp.getTime()) / (1000 * 60 * 60);
  if (hoursOld < 1) score += 15; // Very recent
  else if (hoursOld < 4) score += 10;
  else if (hoursOld < 24) score += 5;

  // Due date proximity
  if (message.dueDate) {
    const hoursToDue = (message.dueDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursToDue < 4) score += 20; // Due in less than 4 hours
    else if (hoursToDue < 24) score += 15; // Due today
    else if (hoursToDue < 48) score += 10; // Due tomorrow
    else if (hoursToDue < 0) score += 25; // Overdue!
  }

  // User mentions
  if (message.mentions && message.mentions.length > 0) {
    score += 15;
  }

  return Math.min(score, 100);
};

/**
 * Calculate impact score (0-100) based on business importance
 */
export const calculateImpactScore = (message: {
  sender: string;
  content: string;
  hasActionItems: boolean;
}): number => {
  let score = 0;

  // VIP sender detection
  const senderLower = message.sender.toLowerCase();
  const isVIP = VIP_SENDERS.some(vip => senderLower.includes(vip));
  if (isVIP) score += 30;

  // Action items required
  if (message.hasActionItems) score += 20;

  // Check for business impact keywords
  const contentLower = message.content.toLowerCase();
  const businessKeywords = ['revenue', 'client', 'customer', 'deal', 'contract', 'budget', 'board', 'investor'];
  const businessKeywordCount = businessKeywords.filter(kw => contentLower.includes(kw)).length;
  score += Math.min(businessKeywordCount * 10, 30);

  // Financial mentions
  if (contentLower.match(/\$[\d,]+[kmb]?/)) score += 15;

  // Team/organization impact
  const teamKeywords = ['team', 'department', 'everyone', 'all-hands', 'company-wide'];
  const hasTeamImpact = teamKeywords.some(kw => contentLower.includes(kw));
  if (hasTeamImpact) score += 15;

  return Math.min(score, 100);
};

/**
 * Calculate overall priority score for Teams messages
 */
export const scoreTeamsMessage = (message: TeamsMessage): PriorityScore => {
  const urgencyScore = calculateUrgencyScore({
    content: message.content,
    timestamp: message.timestamp,
    priority: message.priority,
    mentions: message.mentions,
  });

  const impactScore = calculateImpactScore({
    sender: message.sender,
    content: message.content,
    hasActionItems: message.hasActionItems,
  });

  const overallScore = (urgencyScore * 0.6) + (impactScore * 0.4);

  return {
    messageId: message.id,
    urgencyScore,
    impactScore,
    overallScore,
    factors: {
      hasDeadline: false,
      mentionsUser: message.mentions ? message.mentions.length > 0 : false,
      fromVIP: VIP_SENDERS.some(vip => message.sender.toLowerCase().includes(vip)),
      hasActionItems: message.hasActionItems,
      stakeholderImportance: impactScore / 10,
    },
  };
};

/**
 * Calculate overall priority score for Outlook emails
 */
export const scoreOutlookEmail = (email: OutlookEmail): PriorityScore => {
  const urgencyScore = calculateUrgencyScore({
    content: email.subject + ' ' + email.body,
    timestamp: email.timestamp,
    priority: email.priority,
  });

  const impactScore = calculateImpactScore({
    sender: email.from,
    content: email.subject + ' ' + email.body,
    hasActionItems: email.body.toLowerCase().includes('action') || 
                    email.body.toLowerCase().includes('required'),
  });

  const overallScore = (urgencyScore * 0.6) + (impactScore * 0.4);

  return {
    messageId: email.id,
    urgencyScore,
    impactScore,
    overallScore,
    factors: {
      hasDeadline: urgencyScore > 70,
      mentionsUser: email.to.includes('you@company.com'),
      fromVIP: VIP_SENDERS.some(vip => email.from.toLowerCase().includes(vip)),
      hasActionItems: email.body.toLowerCase().includes('action'),
      stakeholderImportance: impactScore / 10,
    },
  };
};

/**
 * Calculate overall priority score for WhatsApp messages
 */
export const scoreWhatsAppMessage = (message: WhatsAppMessage): PriorityScore => {
  const urgencyScore = calculateUrgencyScore({
    content: message.content,
    timestamp: message.timestamp,
    priority: message.priority,
  });

  const impactScore = calculateImpactScore({
    sender: message.sender,
    content: message.content,
    hasActionItems: ACTION_KEYWORDS.some(kw => message.content.toLowerCase().includes(kw)),
  });

  const overallScore = (urgencyScore * 0.7) + (impactScore * 0.3); // WhatsApp = more urgent bias

  return {
    messageId: message.id,
    urgencyScore,
    impactScore,
    overallScore,
    factors: {
      hasDeadline: false,
      mentionsUser: message.content.includes('@You') || message.content.includes('@you'),
      fromVIP: VIP_SENDERS.some(vip => message.sender.toLowerCase().includes(vip)),
      hasActionItems: ACTION_KEYWORDS.some(kw => message.content.toLowerCase().includes(kw)),
      stakeholderImportance: impactScore / 10,
    },
  };
};

/**
 * Calculate overall priority score for Calendar events
 */
export const scoreCalendarEvent = (event: CalendarEvent): PriorityScore => {
  const now = Date.now();
  const timeToStart = (event.startTime.getTime() - now) / (1000 * 60 * 60); // hours

  let urgencyScore = 0;
  if (timeToStart < 1) urgencyScore = 90; // Starting within an hour
  else if (timeToStart < 4) urgencyScore = 70; // Starting in 4 hours
  else if (timeToStart < 24) urgencyScore = 50; // Starting today
  else if (timeToStart < 48) urgencyScore = 30; // Starting tomorrow

  // Add urgency for prep required
  if (event.requiresPrep) urgencyScore += 10;

  const impactScore = calculateImpactScore({
    sender: event.organizer,
    content: event.title + ' ' + event.description,
    hasActionItems: event.requiresPrep,
  });

  const overallScore = (urgencyScore * 0.5) + (impactScore * 0.5);

  return {
    messageId: event.id,
    urgencyScore,
    impactScore,
    overallScore,
    factors: {
      hasDeadline: true,
      mentionsUser: true,
      fromVIP: VIP_SENDERS.some(vip => event.organizer.toLowerCase().includes(vip)),
      hasActionItems: event.requiresPrep,
      timeToDeadline: Math.max(timeToStart, 0),
      stakeholderImportance: impactScore / 10,
    },
  };
};
