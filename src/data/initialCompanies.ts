/**
 * Initial Company Configurations
 * Pre-configured based on research
 */

import type { Company } from '../types/company';

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'othain-group',
    name: 'Othain Group',
    industry: 'Digital Transformation & IT Consulting',
    stage: 'established',
    employees: 135,
    description: 'ISO-certified digital transformation consultancy specializing in SAP/Oracle solutions, QA/testing, RPA, and finance & accounting automation',
    
    mission: 'Accelerate digital transformation and improve process efficiency for enterprise clients',
    vision: 'Leading global partner for intelligent automation and quality engineering',
    
    currentGoals: [
      'Expand AI solutions practice',
      'Grow testing automation services',
      'Increase enterprise client base',
      'Build strategic partnerships with SAP/Oracle',
    ],
    
    keyMetrics: [
      { name: 'Annual Revenue', value: '19.6M', unit: 'USD', trend: 'up', period: 'yearly', lastUpdated: new Date() },
      { name: 'Employees', value: 135, unit: 'people', trend: 'up', period: 'monthly', lastUpdated: new Date() },
      { name: 'Client Retention', value: 95, unit: '%', target: 98, period: 'yearly', lastUpdated: new Date() },
    ],
    
    departments: [
      'QA & Testing',
      'SAP Solutions',
      'Oracle Solutions',
      'RPA & Automation',
      'Finance & Accounting',
      'Product Engineering',
      'AI Solutions',
      'Sales',
      'Operations',
    ],
    
    keyStakeholders: [
      { name: 'Deepesh V', role: 'CEO', priority: 'executive', contactInfo: { email: 'deepesh.vellore@jerseytechpartners.com' } },
    ],
    
    competitors: [
      'Accenture (Testing Services)',
      'Cognizant',
      'Infosys',
      'TCS',
      'Local IT consulting firms',
    ],
    
    targetMarket: 'Mid to large enterprises in financial services, healthcare, retail, and insurance',
    marketPosition: 'Specialized boutique consultancy competing on quality and domain expertise',
    
    settings: {
      timezone: 'America/New_York',
      workingHours: { start: '09:00', end: '18:00' },
      workingDays: [1, 2, 3, 4, 5],
      fiscalYearStart: '01-01',
      integrations: {
        newsEnabled: true,
        marketDataEnabled: true,
        competitorTrackingEnabled: true,
        industryInsightsEnabled: true,
      },
      aiSettings: {
        aggressiveness: 'balanced',
        focusAreas: ['Business Development', 'Service Excellence', 'Team Growth', 'Strategic Partnerships'],
        priorityFramework: 'impact-effort',
      },
    },
    
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  {
    id: 'jersey-tech-partners',
    name: 'Jersey Technology Partners',
    industry: 'IT Services & Digital Transformation',
    stage: 'growth',
    description: 'Technology consulting firm delivering product engineering, digital services, IT consultancy, and AI solutions with global delivery',
    
    mission: 'Enable business transformation through innovative technology solutions',
    vision: 'Trusted technology partner for digital-first enterprises',
    
    currentGoals: [
      'Scale AI/ML consulting practice',
      'Expand cloud migration services',
      'Build strategic client relationships',
      'Develop proprietary IP/products',
    ],
    
    keyMetrics: [
      { name: 'Active Projects', value: 15, unit: 'projects', trend: 'up', period: 'monthly', lastUpdated: new Date() },
      { name: 'Client Satisfaction', value: 4.7, unit: '/5', target: 4.8, period: 'quarterly', lastUpdated: new Date() },
    ],
    
    departments: [
      'Product Engineering',
      'Digital Services',
      'AI Solutions',
      'IT Consulting',
      'Cloud Services',
      'Sales & BD',
      'Delivery Management',
    ],
    
    keyStakeholders: [
      { name: 'Deepesh V', role: 'CEO/Founder', priority: 'executive', contactInfo: { email: 'deepesh.vellore@jerseytechpartners.com' } },
    ],
    
    competitors: [
      'Traditional IT consulting firms',
      'Offshore development companies',
      'Digital agencies',
      'Cloud consultancies (AWS, Azure partners)',
    ],
    
    targetMarket: 'Mid-market companies (50-500 employees) seeking digital transformation and product development',
    marketPosition: 'Agile technology partner with focus on AI/ML and modern cloud architectures',
    
    settings: {
      timezone: 'America/New_York',
      workingHours: { start: '09:00', end: '18:00' },
      workingDays: [1, 2, 3, 4, 5],
      fiscalYearStart: '01-01',
      integrations: {
        newsEnabled: true,
        marketDataEnabled: true,
        competitorTrackingEnabled: true,
        industryInsightsEnabled: true,
      },
      aiSettings: {
        aggressiveness: 'aggressive',
        focusAreas: ['AI/ML Growth', 'Strategic Partnerships', 'Product Development', 'Market Expansion'],
        priorityFramework: 'impact-effort',
      },
    },
    
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  {
    id: 'strivio-llc',
    name: 'Strivio LLC',
    industry: 'Executive Services & Business Intelligence',
    stage: 'startup',
    description: 'Strategic advisory and executive intelligence platform for C-level executives',
    
    mission: 'Empower executives with AI-driven strategic intelligence and decision support',
    vision: 'The external brain for every CEO navigating complex organizational dynamics',
    
    currentGoals: [
      'Launch Strategic Advisor platform',
      'Acquire first 10 enterprise clients',
      'Build reputation in executive coaching space',
      'Develop proprietary AGI strategic framework',
    ],
    
    keyMetrics: [
      { name: 'Beta Users', value: 0, unit: 'executives', target: 10, period: 'monthly', lastUpdated: new Date() },
      { name: 'Platform Uptime', value: 99.9, unit: '%', target: 99.99, period: 'monthly', lastUpdated: new Date() },
    ],
    
    departments: [
      'Product Development',
      'AI/ML Engineering',
      'Sales & Marketing',
      'Customer Success',
    ],
    
    keyStakeholders: [
      { name: 'Deepesh V', role: 'Founder & CEO', priority: 'executive', contactInfo: { email: 'deepesh.vellore@jerseytechpartners.com' } },
    ],
    
    competitors: [
      'Executive coaching firms',
      'Business intelligence platforms',
      'AI assistants (ChatGPT, Claude)',
      'Traditional EAs and CoS services',
    ],
    
    targetMarket: 'CEOs and founders managing multiple companies or complex organizations (7-8 figure businesses)',
    marketPosition: 'AI-first strategic intelligence platform for executive decision-making',
    
    settings: {
      timezone: 'America/New_York',
      workingHours: { start: '08:00', end: '20:00' },
      workingDays: [1, 2, 3, 4, 5],
      fiscalYearStart: '01-01',
      integrations: {
        newsEnabled: true,
        marketDataEnabled: true,
        competitorTrackingEnabled: true,
        industryInsightsEnabled: true,
      },
      aiSettings: {
        aggressiveness: 'aggressive',
        focusAreas: ['Product Development', 'Market Validation', 'Early Customer Acquisition', 'Fundraising'],
        priorityFramework: 'eisenhower',
      },
    },
    
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
