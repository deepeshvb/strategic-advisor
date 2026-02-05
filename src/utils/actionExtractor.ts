/**
 * Action Item Extraction
 * Parses messages to extract actionable tasks and deadlines
 */

import { ActionItem } from '../types';
import type { TeamsMessage, OutlookEmail, WhatsAppMessage } from '../services/syntheticData';

// Action verbs that indicate tasks
const ACTION_VERBS = [
  'review', 'approve', 'sign', 'confirm', 'respond', 'reply', 'answer',
  'schedule', 'book', 'arrange', 'organize', 'plan', 'prepare',
  'complete', 'finish', 'submit', 'send', 'deliver', 'provide',
  'update', 'revise', 'modify', 'change', 'fix', 'resolve',
  'discuss', 'call', 'meet', 'sync', 'chat', 'talk',
  'create', 'write', 'draft', 'build', 'develop', 'implement',
  'check', 'verify', 'validate', 'test', 'investigate', 'analyze',
];

// Deadline patterns
const DEADLINE_PATTERNS = [
  /by (eod|end of day|today|tomorrow|this week|next week)/i,
  /by (\w+ \d+)/i, // "by Feb 15"
  /due (today|tomorrow|this week|next week)/i,
  /deadline: (\w+ \d+)/i,
  /before (\d+:\d+ [ap]m)/i,
];

/**
 * Extract deadline from text
 */
const extractDeadline = (text: string): Date | undefined => {
  const now = new Date();
  
  // Check for "EOD" or "end of day"
  if (/by (eod|end of day|today)/i.test(text)) {
    const eod = new Date(now);
    eod.setHours(17, 0, 0, 0);
    return eod;
  }

  // Check for "tomorrow"
  if (/by tomorrow|due tomorrow/i.test(text)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0);
    return tomorrow;
  }

  // Check for "this week"
  if (/by this week|due this week/i.test(text)) {
    const endOfWeek = new Date(now);
    const daysUntilFriday = (5 - now.getDay() + 7) % 7;
    endOfWeek.setDate(endOfWeek.getDate() + daysUntilFriday);
    endOfWeek.setHours(17, 0, 0, 0);
    return endOfWeek;
  }

  // Check for "next week"
  if (/by next week|due next week/i.test(text)) {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(17, 0, 0, 0);
    return nextWeek;
  }

  return undefined;
};

/**
 * Extract action items from Teams message
 */
export const extractActionsFromTeams = (message: TeamsMessage): ActionItem[] => {
  const actions: ActionItem[] = [];
  
  if (!message.hasActionItems) return actions;

  const contentLower = message.content.toLowerCase();
  const sentences = message.content.split(/[.!?]\s+/);

  sentences.forEach(sentence => {
    const sentenceLower = sentence.toLowerCase();
    
    // Check if sentence contains action verbs
    const hasActionVerb = ACTION_VERBS.some(verb => 
      new RegExp(`\\b${verb}\\b`).test(sentenceLower)
    );

    // Check if sentence mentions the user
    const mentionsUser = sentence.includes('@You') || 
                         sentenceLower.includes('can you') ||
                         sentenceLower.includes('please') ||
                         sentenceLower.includes('need you') ||
                         sentenceLower.includes('could you');

    if (hasActionVerb && mentionsUser) {
      const deadline = extractDeadline(sentence);
      
      actions.push({
        id: `action-${message.id}-${actions.length}`,
        description: sentence.trim(),
        source: `Teams - ${message.channel}`,
        sourceMessageId: message.id,
        priority: message.priority,
        dueDate: deadline,
        assignee: 'You',
        completed: false,
        extractedAt: new Date(),
      });
    }
  });

  return actions;
};

/**
 * Extract action items from Outlook email
 */
export const extractActionsFromOutlook = (email: OutlookEmail): ActionItem[] => {
  const actions: ActionItem[] = [];
  
  const fullText = email.subject + ' ' + email.body;
  const contentLower = fullText.toLowerCase();
  
  // Check for explicit action required
  const hasActionRequired = contentLower.includes('action required') || 
                           contentLower.includes('action items') ||
                           contentLower.includes('to-do');

  const sentences = email.body.split(/[.!?\n]\s+/);

  sentences.forEach(sentence => {
    const sentenceLower = sentence.toLowerCase();
    
    // Check if sentence contains action verbs
    const hasActionVerb = ACTION_VERBS.some(verb => 
      new RegExp(`\\b${verb}\\b`).test(sentenceLower)
    );

    // Check if this is directed at the user
    const isDirected = sentenceLower.includes('please') ||
                       sentenceLower.includes('could you') ||
                       sentenceLower.includes('can you') ||
                       sentenceLower.includes('need') ||
                       sentenceLower.includes('required');

    if (hasActionVerb && (isDirected || hasActionRequired)) {
      const deadline = extractDeadline(sentence);
      
      // Skip very short sentences (likely fragments)
      if (sentence.trim().length > 20) {
        actions.push({
          id: `action-${email.id}-${actions.length}`,
          description: sentence.trim(),
          source: `Email from ${email.from.split('<')[0].trim()}`,
          sourceMessageId: email.id,
          priority: email.priority,
          dueDate: deadline,
          assignee: 'You',
          completed: false,
          extractedAt: new Date(),
        });
      }
    }
  });

  return actions;
};

/**
 * Extract action items from WhatsApp message
 */
export const extractActionsFromWhatsApp = (message: WhatsAppMessage): ActionItem[] => {
  const actions: ActionItem[] = [];
  
  const contentLower = message.content.toLowerCase();
  
  // Check if message contains action verbs
  const hasActionVerb = ACTION_VERBS.some(verb => 
    new RegExp(`\\b${verb}\\b`).test(contentLower)
  );

  // Check if it's a question or request
  const isRequest = message.content.includes('?') ||
                   contentLower.includes('can you') ||
                   contentLower.includes('could you') ||
                   contentLower.includes('please') ||
                   message.content.includes('@You');

  if (hasActionVerb && isRequest && message.content.length > 15) {
    const deadline = extractDeadline(message.content);
    
    actions.push({
      id: `action-${message.id}`,
      description: message.content.trim(),
      source: `WhatsApp - ${message.chatName}`,
      sourceMessageId: message.id,
      priority: message.priority,
      dueDate: deadline,
      assignee: 'You',
      completed: false,
      extractedAt: new Date(),
    });
  }

  return actions;
};

/**
 * Consolidate and deduplicate action items
 */
export const consolidateActions = (actions: ActionItem[]): ActionItem[] => {
  // Remove duplicates based on similar descriptions
  const unique: ActionItem[] = [];
  
  actions.forEach(action => {
    const isDuplicate = unique.some(existing => {
      // Simple similarity check - could be enhanced with fuzzy matching
      const desc1 = existing.description.toLowerCase().trim();
      const desc2 = action.description.toLowerCase().trim();
      return desc1 === desc2 || desc1.includes(desc2) || desc2.includes(desc1);
    });
    
    if (!isDuplicate) {
      unique.push(action);
    }
  });

  // Sort by priority and due date
  return unique.sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority];
    const bPriority = priorityOrder[b.priority];
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    // If same priority, sort by due date
    if (a.dueDate && b.dueDate) {
      return a.dueDate.getTime() - b.dueDate.getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    
    return 0;
  });
};
