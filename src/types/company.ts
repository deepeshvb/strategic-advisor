// Multi-Company Configuration Types

export interface Company {
  id: string;
  name: string;
  industry: string;
  founded?: Date;
  employees?: number;
  stage: 'startup' | 'growth' | 'enterprise' | 'established';
  description?: string;
  
  // Strategic context
  mission?: string;
  vision?: string;
  currentGoals: string[];
  keyMetrics: CompanyMetric[];
  
  // Organizational structure
  departments: string[];
  keyStakeholders: Stakeholder[];
  
  // Market context
  competitors?: string[];
  targetMarket?: string;
  marketPosition?: string;
  
  // Configuration
  settings: CompanySettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyMetric {
  name: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'flat';
  target?: number | string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  lastUpdated: Date;
}

export interface Stakeholder {
  name: string;
  role: string;
  department?: string;
  priority: 'executive' | 'key' | 'important' | 'monitor';
  contactInfo?: {
    email?: string;
    phone?: string;
  };
}

export interface CompanySettings {
  timezone: string;
  workingHours: {
    start: string; // "09:00"
    end: string;   // "17:00"
  };
  workingDays: number[]; // [1,2,3,4,5] = Mon-Fri
  fiscalYearStart: string; // "01-01" or "04-01"
  
  // Integration preferences
  integrations: {
    newsEnabled: boolean;
    marketDataEnabled: boolean;
    competitorTrackingEnabled: boolean;
    industryInsightsEnabled: boolean;
  };
  
  // AI preferences
  aiSettings: {
    aggressiveness: 'conservative' | 'balanced' | 'aggressive';
    focusAreas: string[];
    priorityFramework: 'eisenhower' | 'impact-effort' | 'custom';
  };
}

export interface CompanyContext {
  company: Company;
  historicalDecisions: HistoricalDecision[];
  marketIntelligence: MarketIntelligence;
  competitorActivity: CompetitorUpdate[];
  industryTrends: IndustryTrend[];
}

export interface HistoricalDecision {
  id: string;
  date: Date;
  decision: string;
  reasoning: string;
  outcome?: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  category: 'product' | 'hiring' | 'finance' | 'strategy' | 'operations' | 'other';
}

export interface MarketIntelligence {
  lastUpdated: Date;
  news: NewsItem[];
  marketConditions: {
    sentiment: 'bullish' | 'bearish' | 'neutral';
    volatility: 'low' | 'medium' | 'high';
    keyEvents: string[];
  };
  economicIndicators: {
    gdpGrowth?: number;
    inflation?: number;
    unemploymentRate?: number;
    interestRate?: number;
  };
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: Date;
  relevance: 'high' | 'medium' | 'low';
  category: 'industry' | 'competitor' | 'market' | 'technology' | 'regulation' | 'other';
  url?: string;
}

export interface CompetitorUpdate {
  competitor: string;
  date: Date;
  activity: string;
  impact: 'threat' | 'opportunity' | 'neutral';
  source: string;
}

export interface IndustryTrend {
  id: string;
  trend: string;
  description: string;
  relevance: 'critical' | 'important' | 'monitor';
  timeframe: 'immediate' | 'short-term' | 'long-term';
  implications: string[];
}
