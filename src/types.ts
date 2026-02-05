// Chat Message Types
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    sources?: string[];
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    actionItems?: ActionItem[];
    relatedMessages?: string[];
  };
}

// Channel Types
export interface Channel {
  id: string;
  name: string;
  type: 'email' | 'teams' | 'slack' | 'calendar' | 'whatsapp' | 'gmail' | 'other';
  connected: boolean;
  lastSync?: Date;
  unreadCount?: number;
}

// Priority and Action Item Types
export interface Priority {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: string;
  dueDate?: Date;
  completed: boolean;
}

export interface ActionItem {
  id: string;
  description: string;
  source: string;
  sourceMessageId: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  assignee?: string;
  completed: boolean;
  extractedAt: Date;
}

// Insight Types
export interface Insight {
  id: string;
  type: 'trend' | 'alert' | 'suggestion' | 'summary';
  title: string;
  description: string;
  channels: string[];
  timestamp: Date;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionable?: boolean;
}

export interface ConversationContext {
  activeChannels: Channel[];
  recentInsights: Insight[];
  priorities: Priority[];
  actionItems?: ActionItem[];
}

// AI Analysis Types
export interface PriorityScore {
  messageId: string;
  urgencyScore: number; // 0-100
  impactScore: number; // 0-100
  overallScore: number; // 0-100
  factors: {
    hasDeadline: boolean;
    mentionsUser: boolean;
    fromVIP: boolean;
    hasActionItems: boolean;
    timeToDeadline?: number; // hours
    stakeholderImportance: number; // 0-10
  };
}

export interface Pattern {
  id: string;
  type: 'recurring_topic' | 'communication_spike' | 'response_delay' | 'workload_imbalance';
  description: string;
  frequency: number;
  affectedChannels: string[];
  timeframe: {
    start: Date;
    end: Date;
  };
  recommendation?: string;
}

export interface StrategicInsight {
  id: string;
  category: 'time_management' | 'delegation' | 'focus_areas' | 'risk' | 'opportunity';
  title: string;
  description: string;
  reasoning: string;
  actionableSteps?: string[];
  expectedImpact: 'low' | 'medium' | 'high';
  timeToImplement?: string;
}

// Foundry LLM Types
export interface LLMConfig {
  apiEndpoint: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  streaming: boolean;
}

export interface LLMRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  id: string;
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'error';
}

// Synthetic Data Re-exports (for components to use)
export type { TeamsMessage, OutlookEmail, WhatsAppMessage, GmailEmail, CalendarEvent } from './services/syntheticData';

// Settings Types
export interface AppSettings {
  llm: {
    provider: 'foundry' | 'openai' | 'anthropic' | 'mock';
    config: LLMConfig;
  };
  ai: {
    responseStyle: 'concise' | 'detailed' | 'balanced';
    proactivityLevel: 'low' | 'medium' | 'high';
    focusAreas: string[];
    enableVoice: boolean;
  };
  notifications: {
    enableProactiveAlerts: boolean;
    vipSenders: string[];
    urgencyThreshold: 'high' | 'urgent';
  };
  data: {
    syncInterval: number; // minutes
    retentionDays: number;
  };
}
