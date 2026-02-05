/**
 * Synthetic Data Generation Service
 * Generates realistic communication data across multiple channels
 * For demonstration and testing purposes
 */

export interface TeamsMessage {
  id: string;
  channel: string;
  sender: string;
  content: string;
  timestamp: Date;
  threadId?: string;
  mentions?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  hasActionItems: boolean;
  reactions?: { emoji: string; count: number }[];
}

export interface OutlookEmail {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  timestamp: Date;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  hasAttachments: boolean;
  threadId?: string;
  labels?: string[];
}

export interface WhatsAppMessage {
  id: string;
  chatName: string;
  sender: string;
  content: string;
  timestamp: Date;
  isGroup: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  hasMedia: boolean;
}

export interface GmailEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  timestamp: Date;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'primary' | 'social' | 'promotions' | 'updates';
  labels?: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location: string;
  isRecurring: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  meetingLink?: string;
  organizer: string;
  requiresPrep: boolean;
}

// Helper function to generate timestamps
const getTimestamp = (hoursAgo: number, minutesAgo: number = 0): Date => {
  return new Date(Date.now() - (hoursAgo * 3600000) - (minutesAgo * 60000));
};

// Teams Messages - 50+ realistic messages
export const syntheticTeamsMessages: TeamsMessage[] = [
  // Engineering Channel - Urgent
  {
    id: 'tm-001',
    channel: 'Engineering',
    sender: 'Alex Chen',
    content: '@You The production API is experiencing 500 errors. Can you review the deployment logs ASAP? Users are reporting issues.',
    timestamp: getTimestamp(0, 15),
    mentions: ['You'],
    priority: 'urgent',
    hasActionItems: true,
    reactions: [{ emoji: '🔥', count: 3 }],
  },
  {
    id: 'tm-002',
    channel: 'Engineering',
    sender: 'Sarah Miller',
    content: 'I found the issue - it\'s in the authentication middleware. Rolling back now.',
    timestamp: getTimestamp(0, 10),
    threadId: 'tm-001',
    priority: 'urgent',
    hasActionItems: false,
  },
  {
    id: 'tm-003',
    channel: 'Engineering',
    sender: 'Alex Chen',
    content: 'Thanks Sarah! @You Can you approve the rollback in the deployment pipeline?',
    timestamp: getTimestamp(0, 5),
    threadId: 'tm-001',
    mentions: ['You'],
    priority: 'urgent',
    hasActionItems: true,
  },
  
  // Product Channel - High Priority
  {
    id: 'tm-004',
    channel: 'Product',
    sender: 'Jessica Wang',
    content: '@You The Q1 roadmap review is scheduled for tomorrow. Can you share your team\'s capacity estimates?',
    timestamp: getTimestamp(1, 30),
    mentions: ['You'],
    priority: 'high',
    hasActionItems: true,
  },
  {
    id: 'tm-005',
    channel: 'Product',
    sender: 'Marcus Johnson',
    content: 'Updated the user story for the new dashboard feature. Please review when you get a chance.',
    timestamp: getTimestamp(2),
    priority: 'medium',
    hasActionItems: true,
    reactions: [{ emoji: '👍', count: 2 }],
  },
  {
    id: 'tm-006',
    channel: 'Product',
    sender: 'Jessica Wang',
    content: 'Customer feedback survey results are in! 87% satisfaction rate on the new checkout flow. Great work team!',
    timestamp: getTimestamp(3),
    priority: 'low',
    hasActionItems: false,
    reactions: [{ emoji: '🎉', count: 5 }, { emoji: '🚀', count: 3 }],
  },
  
  // Finance Channel - Urgent Budget Items
  {
    id: 'tm-007',
    channel: 'Finance',
    sender: 'David Park',
    content: '@You Reminder: Q1 budget approval needed by EOD. Finance committee meets tomorrow morning.',
    timestamp: getTimestamp(0, 45),
    mentions: ['You'],
    priority: 'urgent',
    hasActionItems: true,
  },
  {
    id: 'tm-008',
    channel: 'Finance',
    sender: 'Rachel Kim',
    content: 'Updated budget spreadsheet with revised projections. Link in the files tab.',
    timestamp: getTimestamp(1),
    threadId: 'tm-007',
    priority: 'high',
    hasActionItems: false,
  },
  {
    id: 'tm-009',
    channel: 'Finance',
    sender: 'David Park',
    content: 'Thanks Rachel. @You Particularly need your input on the R&D allocation - it\'s 15% over last quarter.',
    timestamp: getTimestamp(0, 40),
    threadId: 'tm-007',
    mentions: ['You'],
    priority: 'urgent',
    hasActionItems: true,
  },
  
  // Sales Channel
  {
    id: 'tm-010',
    channel: 'Sales',
    sender: 'Tom Rodriguez',
    content: 'Enterprise client TechCorp is ready to sign! They want a 30-minute call with leadership this week.',
    timestamp: getTimestamp(2, 15),
    priority: 'high',
    hasActionItems: true,
    reactions: [{ emoji: '💰', count: 4 }],
  },
  {
    id: 'tm-011',
    channel: 'Sales',
    sender: 'Lisa Chen',
    content: '@You Can you join the TechCorp demo on Thursday? They specifically asked for the technical lead.',
    timestamp: getTimestamp(2),
    mentions: ['You'],
    priority: 'high',
    hasActionItems: true,
  },
  {
    id: 'tm-012',
    channel: 'Sales',
    sender: 'Tom Rodriguez',
    content: 'Q1 pipeline update: 12 deals in final stages, $2.4M potential revenue. Report attached.',
    timestamp: getTimestamp(4),
    priority: 'medium',
    hasActionItems: false,
  },
  
  // Leadership Channel
  {
    id: 'tm-013',
    channel: 'Leadership',
    sender: 'CEO Jennifer Brooks',
    content: 'Board meeting prep: Please submit your quarterly OKR updates by Wednesday EOD.',
    timestamp: getTimestamp(5),
    priority: 'high',
    hasActionItems: true,
  },
  {
    id: 'tm-014',
    channel: 'Leadership',
    sender: 'CTO Michael Chen',
    content: 'Tech strategy session moved to Friday 2 PM. We\'ll discuss AI integration roadmap.',
    timestamp: getTimestamp(6),
    priority: 'medium',
    hasActionItems: false,
  },
  {
    id: 'tm-015',
    channel: 'Leadership',
    sender: 'CFO Robert Singh',
    content: '@You Following up on the infrastructure cost optimization plan. Need your recommendations before budget freeze.',
    timestamp: getTimestamp(1, 20),
    mentions: ['You'],
    priority: 'high',
    hasActionItems: true,
  },
  
  // More Engineering Messages
  {
    id: 'tm-016',
    channel: 'Engineering',
    sender: 'Nina Patel',
    content: 'Code review needed: New caching layer implementation (PR #342). Aiming to deploy next sprint.',
    timestamp: getTimestamp(3, 30),
    priority: 'medium',
    hasActionItems: true,
  },
  {
    id: 'tm-017',
    channel: 'Engineering',
    sender: 'Chris Lee',
    content: '@You Security audit found some vulnerabilities in the API. Can we discuss mitigation strategies?',
    timestamp: getTimestamp(4),
    mentions: ['You'],
    priority: 'high',
    hasActionItems: true,
  },
  {
    id: 'tm-018',
    channel: 'Engineering',
    sender: 'Alex Chen',
    content: 'Standup in 10 minutes! Quick sync on sprint progress.',
    timestamp: getTimestamp(0, 10),
    priority: 'medium',
    hasActionItems: false,
  },
  {
    id: 'tm-019',
    channel: 'Engineering',
    sender: 'Sarah Miller',
    content: 'Successfully deployed the hotfix. All systems green. Monitoring for the next hour.',
    timestamp: getTimestamp(0, 3),
    priority: 'medium',
    hasActionItems: false,
    reactions: [{ emoji: '✅', count: 6 }],
  },
  {
    id: 'tm-020',
    channel: 'Engineering',
    sender: 'Nina Patel',
    content: '@You Can you review the architecture proposal for the new microservice? Doc link in files.',
    timestamp: getTimestamp(8),
    mentions: ['You'],
    priority: 'medium',
    hasActionItems: true,
  },
  
  // Product Team Discussions
  {
    id: 'tm-021',
    channel: 'Product',
    sender: 'Marcus Johnson',
    content: 'User research findings: 73% of users want dark mode. Should we prioritize this?',
    timestamp: getTimestamp(7),
    priority: 'low',
    hasActionItems: false,
  },
  {
    id: 'tm-022',
    channel: 'Product',
    sender: 'Jessica Wang',
    content: '@You Your input needed: Should we pivot the mobile app timeline for the enterprise features?',
    timestamp: getTimestamp(5, 15),
    mentions: ['You'],
    priority: 'high',
    hasActionItems: true,
  },
  {
    id: 'tm-023',
    channel: 'Product',
    sender: 'Emma Davis',
    content: 'Analytics show 40% increase in user engagement after last release! 🎯',
    timestamp: getTimestamp(12),
    priority: 'low',
    hasActionItems: false,
    reactions: [{ emoji: '📈', count: 8 }],
  },
  
  // Finance Updates
  {
    id: 'tm-024',
    channel: 'Finance',
    sender: 'Rachel Kim',
    content: 'Monthly expense report ready for review. Cloud costs up 12% - need to investigate.',
    timestamp: getTimestamp(10),
    priority: 'medium',
    hasActionItems: true,
  },
  {
    id: 'tm-025',
    channel: 'Finance',
    sender: 'David Park',
    content: '@You Budget variance report shows R&D overspend. Can we schedule a 30-min call?',
    timestamp: getTimestamp(7, 30),
    mentions: ['You'],
    priority: 'high',
    hasActionItems: true,
  },
  
  // Sales Team
  {
    id: 'tm-026',
    channel: 'Sales',
    sender: 'Tom Rodriguez',
    content: 'New lead from AutoTech Inc - $500K annual contract potential. Need technical validation.',
    timestamp: getTimestamp(9),
    priority: 'high',
    hasActionItems: true,
  },
  {
    id: 'tm-027',
    channel: 'Sales',
    sender: 'Lisa Chen',
    content: 'Customer success metrics: 92% renewal rate this quarter! Best ever 🏆',
    timestamp: getTimestamp(14),
    priority: 'low',
    hasActionItems: false,
    reactions: [{ emoji: '🎉', count: 7 }],
  },
  
  // Direct Messages
  {
    id: 'tm-028',
    channel: 'Direct Message',
    sender: 'Your Manager - Karen White',
    content: '@You Quick question - are you available for the stakeholder presentation tomorrow at 10 AM?',
    timestamp: getTimestamp(0, 50),
    mentions: ['You'],
    priority: 'high',
    hasActionItems: true,
  },
  {
    id: 'tm-029',
    channel: 'Direct Message',
    sender: 'Your Manager - Karen White',
    content: 'Also, can we do our 1:1 on Friday instead of Thursday? Something came up.',
    timestamp: getTimestamp(0, 48),
    priority: 'medium',
    hasActionItems: true,
  },
  {
    id: 'tm-030',
    channel: 'Direct Message',
    sender: 'Team Member - James Park',
    content: 'Hey, I\'m stuck on the database migration. Can you spare 15 minutes to help debug?',
    timestamp: getTimestamp(1, 15),
    priority: 'medium',
    hasActionItems: true,
  },
];

// Outlook Emails - 40+ realistic emails
export const syntheticOutlookEmails: OutlookEmail[] = [
  // Executive Communications - Urgent
  {
    id: 'oe-001',
    from: 'CEO Jennifer Brooks <jennifer.brooks@company.com>',
    to: ['you@company.com'],
    cc: ['leadership@company.com'],
    subject: 'URGENT: Board Presentation - Q1 Results',
    body: 'Hi,\n\nThe board has moved up the Q1 review to next Tuesday. I need your technical metrics and team performance data by Thursday EOD.\n\nSpecifically:\n- Infrastructure reliability stats\n- Deployment velocity\n- Security incident summary\n- Team headcount and utilization\n\nThis is a priority - please confirm receipt.\n\nBest,\nJennifer',
    timestamp: getTimestamp(0, 30),
    isRead: false,
    priority: 'urgent',
    hasAttachments: false,
    labels: ['Important', 'Executive'],
  },
  
  // Client Email - High Priority
  {
    id: 'oe-002',
    from: 'Sarah Johnson <sjohnson@acmecorp.com>',
    to: ['you@company.com'],
    cc: ['team@acmecorp.com'],
    subject: 'Re: Enterprise Implementation Timeline',
    body: 'Hi,\n\nThank you for the initial proposal. Our CTO has reviewed it and we\'d like to move forward, but need to adjust the timeline.\n\nCan we schedule a call this week to discuss:\n1. Accelerating Phase 1 to 6 weeks instead of 8\n2. Custom integration requirements\n3. Pricing for additional support hours\n\nThis is time-sensitive as we need to present to our board next month.\n\nBest regards,\nSarah Johnson\nVP of Technology, Acme Corp',
    timestamp: getTimestamp(1),
    isRead: false,
    priority: 'high',
    hasAttachments: true,
    threadId: 'oe-002-thread',
    labels: ['Client', 'Action Required'],
  },
  
  // Project Updates
  {
    id: 'oe-003',
    from: 'Project Manager - Mike Chen <mike.chen@company.com>',
    to: ['you@company.com', 'team@company.com'],
    subject: 'Weekly Status Report - Cloud Migration Project',
    body: 'Team,\n\nWeek 4 status update:\n\n✅ Completed:\n- Database migration (Production)\n- Load testing completed\n- Documentation updated\n\n🔄 In Progress:\n- Frontend deployment (80% complete)\n- Security hardening\n\n⚠️ Blockers:\n- Waiting on security team approval for API endpoints\n- Need your sign-off on the disaster recovery plan\n\nNext sprint starts Monday. Please review the updated timeline in the attachment.\n\nMike',
    timestamp: getTimestamp(5),
    isRead: true,
    priority: 'medium',
    hasAttachments: true,
    labels: ['Projects'],
  },
  
  // Meeting Invitations
  {
    id: 'oe-004',
    from: 'Calendar <calendar@company.com>',
    to: ['you@company.com'],
    subject: 'Invitation: Q1 Strategy Review @ Thu Feb 6, 2026 2:00 PM - 3:30 PM (EST)',
    body: 'You have been invited to the following event:\n\nQ1 Strategy Review\nTime: Thursday, February 6, 2026 2:00 PM - 3:30 PM Eastern Time\nLocation: Executive Conference Room / Zoom\n\nAgenda:\n- Q1 Performance Review\n- Q2 Planning\n- Budget Allocation\n- Strategic Initiatives\n\nOrganizer: Jennifer Brooks\nAttendees: Leadership Team (12 people)\n\nPlease accept or decline this invitation.',
    timestamp: getTimestamp(2),
    isRead: false,
    priority: 'high',
    hasAttachments: false,
    labels: ['Meeting'],
  },
  
  // Budget/Finance
  {
    id: 'oe-005',
    from: 'Finance Team <finance@company.com>',
    to: ['you@company.com'],
    cc: ['cfo@company.com'],
    subject: 'Action Required: Q1 Budget Reconciliation',
    body: 'Hi,\n\nWe\'re finalizing Q1 budgets and noticed some discrepancies in your department:\n\n- Cloud infrastructure: $45K over budget\n- Software licenses: $12K under budget  \n- Contractor costs: $8K over budget\n\nPlease provide:\n1. Explanation for overages\n2. Revised Q2 forecast\n3. Cost optimization plan\n\nDeadline: Tomorrow 5 PM EST\n\nThanks,\nFinance Team',
    timestamp: getTimestamp(3),
    isRead: false,
    priority: 'high',
    hasAttachments: true,
    labels: ['Finance', 'Action Required'],
  },
  
  // HR/Admin
  {
    id: 'oe-006',
    from: 'HR Department <hr@company.com>',
    to: ['all-employees@company.com'],
    subject: 'Reminder: Performance Review Season',
    body: 'Dear Team,\n\nQuarterly performance reviews are due by Feb 14th.\n\nManagers: Please complete reviews for all direct reports\nEmployees: Self-assessments due Feb 10th\n\nAccess the portal: https://hr-portal.company.com\n\nContact HR with questions.\n\nBest,\nHR Team',
    timestamp: getTimestamp(8),
    isRead: true,
    priority: 'medium',
    hasAttachments: false,
    labels: ['HR', 'Company-Wide'],
  },
  
  // Vendor Communications
  {
    id: 'oe-007',
    from: 'AWS Support <support@aws.amazon.com>',
    to: ['you@company.com'],
    subject: 'Your AWS Support Case #12345 - High Memory Utilization',
    body: 'Hello,\n\nWe\'ve analyzed your support case regarding high memory utilization on your EC2 instances.\n\nRecommendations:\n1. Upgrade to r5.2xlarge instances for better memory performance\n2. Implement auto-scaling policies\n3. Review application memory leaks\n\nEstimated monthly cost impact: +$450\n\nSchedule a call to discuss implementation?\n\nBest regards,\nAWS Support Team',
    timestamp: getTimestamp(6),
    isRead: false,
    priority: 'medium',
    hasAttachments: true,
    labels: ['Vendors', 'Technical'],
  },
  
  // Team Communication
  {
    id: 'oe-008',
    from: 'Team Lead - Alex Chen <alex.chen@company.com>',
    to: ['you@company.com'],
    subject: 'Feedback Needed: New Hire Candidates',
    body: 'Hi,\n\nWe have 3 strong candidates for the Senior Engineer position. Can you review their technical assessments and provide feedback?\n\n- Candidate A: Strong algorithms, 8 years experience\n- Candidate B: Great system design, startup background\n- Candidate C: Excellent communication, leadership potential\n\nI\'m leaning toward Candidate B, but would love your input. We need to make an offer by next week to avoid losing them.\n\nThanks!\nAlex',
    timestamp: getTimestamp(9),
    isRead: true,
    priority: 'high',
    hasAttachments: true,
    labels: ['Hiring', 'Team'],
  },
  
  // Client Follow-ups
  {
    id: 'oe-009',
    from: 'Robert Martinez <rmartinez@techstart.io>',
    to: ['you@company.com'],
    subject: 'Integration Issues - Need Technical Assistance',
    body: 'Hi,\n\nWe\'re experiencing issues integrating your API with our system:\n\n- Authentication tokens expiring unexpectedly\n- Rate limiting seems inconsistent\n- Webhook delivery delays\n\nOur launch is scheduled for next week and this is blocking our team. Can someone from your engineering team jump on a call today or tomorrow?\n\nThis is urgent - our CTO is escalating if not resolved soon.\n\nRobert Martinez\nCTO, TechStart',
    timestamp: getTimestamp(0, 20),
    isRead: false,
    priority: 'urgent',
    hasAttachments: false,
    labels: ['Client', 'Technical', 'Urgent'],
  },
  
  // Internal Process
  {
    id: 'oe-010',
    from: 'Security Team <security@company.com>',
    to: ['you@company.com', 'engineering@company.com'],
    subject: 'Security Audit Results - Action Items',
    body: 'Team,\n\nQuarterly security audit completed. Key findings:\n\n🔴 Critical (Fix by EOW):\n- Outdated SSL certificates on staging servers\n- Exposed API keys in legacy codebase\n\n🟡 Medium Priority:\n- Update dependency versions (8 packages)\n- Implement 2FA for admin accounts\n- Review access permissions\n\nFull report attached. Please assign owners for each item and update the tracker.\n\nSecurity Team',
    timestamp: getTimestamp(4),
    isRead: false,
    priority: 'high',
    hasAttachments: true,
    labels: ['Security', 'Action Required'],
  },
  
  // More Client Emails
  {
    id: 'oe-011',
    from: 'Emily Watson <ewatson@globalcorp.com>',
    to: ['you@company.com'],
    subject: 'Contract Renewal Discussion',
    body: 'Hi,\n\nOur annual contract is up for renewal next month. We\'ve been happy with the service, but need to discuss:\n\n- Volume discounts (our usage has 3x\'d)\n- Additional features included\n- Dedicated support tier\n\nCan we schedule a call next week?\n\nThanks,\nEmily Watson\nProcurement Manager, GlobalCorp',
    timestamp: getTimestamp(12),
    isRead: true,
    priority: 'medium',
    hasAttachments: false,
    labels: ['Client', 'Renewal'],
  },
  
  // Partnership Opportunities
  {
    id: 'oe-012',
    from: 'Business Development <bd@techpartner.com>',
    to: ['you@company.com'],
    subject: 'Partnership Opportunity - Tech Integration',
    body: 'Hello,\n\nI\'m reaching out from TechPartner Inc. We provide complementary services to yours and see potential for partnership.\n\nOur clients frequently request integrations with solutions like yours. Would you be interested in exploring:\n\n- Co-marketing opportunities\n- Technical integration\n- Revenue share model\n\nWe have 50K+ active users who could benefit from your platform.\n\nInterested in a quick call to explore?\n\nBest,\nDavid Kim\nBD Director, TechPartner',
    timestamp: getTimestamp(15),
    isRead: true,
    priority: 'low',
    hasAttachments: false,
    labels: ['Business Development'],
  },
  
  // Executive Updates
  {
    id: 'oe-013',
    from: 'CTO Michael Chen <michael.chen@company.com>',
    to: ['engineering-leads@company.com'],
    subject: 'Q2 Technical Strategy - Input Needed',
    body: 'Engineering Leadership Team,\n\nPreparing Q2 technical roadmap. Need your input on:\n\n1. Infrastructure modernization priorities\n2. Technical debt allocation (targeting 20% of capacity)\n3. Innovation initiatives\n4. Skill development investments\n\nPlease send your proposals by Friday. We\'ll discuss in next week\'s strategy session.\n\n- Michael',
    timestamp: getTimestamp(7),
    isRead: false,
    priority: 'high',
    hasAttachments: false,
    labels: ['Executive', 'Strategy'],
  },
  
  // Customer Feedback
  {
    id: 'oe-014',
    from: 'Support Team <support@company.com>',
    to: ['you@company.com', 'product@company.com'],
    subject: 'Customer Feedback Escalation - Feature Request',
    body: 'Hi team,\n\nWe\'re seeing consistent feedback from enterprise customers requesting bulk export functionality. This quarter alone:\n\n- 23 feature requests\n- 2 deals blocked pending this feature\n- Multiple support tickets\n\nTop requesting companies:\n- Acme Corp ($120K annual)\n- TechGiant Inc ($200K annual)\n- GlobalTech ($85K annual)\n\nShould we prioritize this for Q2?\n\nSupport Team',
    timestamp: getTimestamp(10),
    isRead: true,
    priority: 'medium',
    hasAttachments: false,
    labels: ['Product', 'Customer Feedback'],
  },
  
  // Newsletter/Updates
  {
    id: 'oe-015',
    from: 'Industry News <newsletter@techindustry.com>',
    to: ['you@company.com'],
    subject: 'Tech Industry Weekly: AI Regulation Updates',
    body: 'Your Weekly Tech Brief\n\nTop Stories:\n- New AI regulations proposed in EU\n- Major cloud provider announces price cuts\n- Cybersecurity threats on the rise\n\nTrending Technologies:\n- Edge computing adoption growing\n- Serverless architectures mainstream\n\nRead full newsletter →',
    timestamp: getTimestamp(18),
    isRead: true,
    priority: 'low',
    hasAttachments: false,
    labels: ['Newsletter'],
  },
  
  // More urgent items
  {
    id: 'oe-016',
    from: 'Your Manager - Karen White <karen.white@company.com>',
    to: ['you@company.com'],
    subject: 'Re: Performance Review Prep',
    body: 'Hi,\n\nFor your upcoming performance review, please prepare:\n\n1. Key accomplishments (Q4 2025 - Q1 2026)\n2. Challenges faced and how you overcame them\n3. Career development goals\n4. Feedback on team/company\n\nOur review meeting is scheduled for next Wednesday. Let\'s make it productive!\n\n- Karen',
    timestamp: getTimestamp(11),
    isRead: false,
    priority: 'medium',
    hasAttachments: false,
    labels: ['Manager', '1-on-1'],
  },
  
  {
    id: 'oe-017',
    from: 'IT Department <it@company.com>',
    to: ['all-staff@company.com'],
    subject: 'URGENT: Security Patch Required - Action by EOD',
    body: 'All Staff,\n\nCritical security vulnerability discovered in company systems.\n\nREQUIRED ACTIONS:\n1. Restart your computer\n2. Run Windows Update / Mac Update\n3. Confirm completion in IT portal\n\nDeadline: Today 6 PM\n\nDevices not updated will be remotely restarted at 7 PM.\n\nQuestions? Contact IT Helpdesk\n\nIT Department',
    timestamp: getTimestamp(0, 120),
    isRead: false,
    priority: 'urgent',
    hasAttachments: false,
    labels: ['IT', 'Security', 'Urgent'],
  },
  
  {
    id: 'oe-018',
    from: 'Conference Organizer <events@techconf2026.com>',
    to: ['you@company.com'],
    subject: 'Speaker Invitation - TechConf 2026',
    body: 'Dear Technology Leader,\n\nWe\'d like to invite you to speak at TechConf 2026 (May 15-17, San Francisco).\n\nProposed topic: "Scaling Engineering Teams in High-Growth Startups"\n\n- 45-minute keynote slot\n- 5,000+ attendees\n- Travel & accommodation covered\n- $2,500 speaker honorarium\n\nInterested? Please respond by Feb 20th.\n\nBest regards,\nTechConf Organizing Committee',
    timestamp: getTimestamp(20),
    isRead: true,
    priority: 'medium',
    hasAttachments: true,
    labels: ['Speaking', 'Conference'],
  },
  
  {
    id: 'oe-019',
    from: 'Legal Team <legal@company.com>',
    to: ['you@company.com'],
    cc: ['compliance@company.com'],
    subject: 'Contract Review Required - TechStart Partnership',
    body: 'Hi,\n\nThe partnership agreement with TechStart requires technical review before signing.\n\nKey clauses needing your input:\n- Data sharing and API access\n- SLA commitments\n- Liability limitations\n- Technical support obligations\n\nPlease review the attached contract and provide feedback by Thursday.\n\nLegal Team',
    timestamp: getTimestamp(13),
    isRead: false,
    priority: 'high',
    hasAttachments: true,
    labels: ['Legal', 'Contracts'],
  },
  
  {
    id: 'oe-020',
    from: 'Team Member - Nina Patel <nina.patel@company.com>',
    to: ['you@company.com'],
    subject: 'Mentorship Request',
    body: 'Hi,\n\nI\'ve been with the team for 6 months now and really admire your technical leadership. Would you be open to mentoring me?\n\nI\'m particularly interested in:\n- System architecture design\n- Technical decision-making\n- Career progression to senior roles\n\nWould a monthly 30-minute chat work for you?\n\nThank you for considering!\n\nNina',
    timestamp: getTimestamp(16),
    isRead: true,
    priority: 'low',
    hasAttachments: false,
    labels: ['Team', 'Mentorship'],
  },
];

// WhatsApp Messages - 30+ realistic messages
export const syntheticWhatsAppMessages: WhatsAppMessage[] = [
  // Leadership Group Chat - Urgent
  {
    id: 'wa-001',
    chatName: 'Leadership Team',
    sender: 'Jennifer (CEO)',
    content: '🚨 Production issue reported by major client. Who\'s available to jump on this?',
    timestamp: getTimestamp(0, 10),
    isGroup: true,
    priority: 'urgent',
    hasMedia: false,
  },
  {
    id: 'wa-002',
    chatName: 'Leadership Team',
    sender: 'Michael (CTO)',
    content: 'On it. Alex is investigating now. Will update in 15 mins.',
    timestamp: getTimestamp(0, 8),
    isGroup: true,
    priority: 'urgent',
    hasMedia: false,
  },
  {
    id: 'wa-003',
    chatName: 'Leadership Team',
    sender: 'You',
    content: 'I can join if needed. Keep me posted.',
    timestamp: getTimestamp(0, 7),
    isGroup: true,
    priority: 'urgent',
    hasMedia: false,
  },
  {
    id: 'wa-004',
    chatName: 'Leadership Team',
    sender: 'Jennifer (CEO)',
    content: 'Thanks team. Client is on the line. Need quick resolution.',
    timestamp: getTimestamp(0, 5),
    isGroup: true,
    priority: 'urgent',
    hasMedia: false,
  },
  
  // Client Communication - High Priority
  {
    id: 'wa-005',
    chatName: 'Acme Corp - Sarah',
    sender: 'Sarah Johnson',
    content: 'Hi! Quick question - can we move tomorrow\'s call to 3 PM instead of 2 PM?',
    timestamp: getTimestamp(1, 30),
    isGroup: false,
    priority: 'high',
    hasMedia: false,
  },
  {
    id: 'wa-006',
    chatName: 'Acme Corp - Sarah',
    sender: 'You',
    content: '3 PM works! I\'ll send updated calendar invite.',
    timestamp: getTimestamp(1, 25),
    isGroup: false,
    priority: 'high',
    hasMedia: false,
  },
  {
    id: 'wa-007',
    chatName: 'Acme Corp - Sarah',
    sender: 'Sarah Johnson',
    content: 'Perfect! Also, our CTO wants to join. Hope that\'s okay?',
    timestamp: getTimestamp(1, 20),
    isGroup: false,
    priority: 'high',
    hasMedia: false,
  },
  
  // Team Coordination
  {
    id: 'wa-008',
    chatName: 'Engineering Team',
    sender: 'Alex',
    content: 'Deployment successful! ✅ All services running normally.',
    timestamp: getTimestamp(0, 2),
    isGroup: true,
    priority: 'medium',
    hasMedia: false,
  },
  {
    id: 'wa-009',
    chatName: 'Engineering Team',
    sender: 'Sarah',
    content: 'Great job everyone! 🎉 Pizza on me Friday!',
    timestamp: getTimestamp(0, 1),
    isGroup: true,
    priority: 'low',
    hasMedia: false,
  },
  
  // Urgent Client Issue
  {
    id: 'wa-010',
    chatName: 'TechStart - Robert',
    sender: 'Robert Martinez',
    content: 'Your API is returning 500 errors. This is blocking our launch! 🔥',
    timestamp: getTimestamp(0, 15),
    isGroup: false,
    priority: 'urgent',
    hasMedia: false,
  },
  {
    id: 'wa-011',
    chatName: 'TechStart - Robert',
    sender: 'Robert Martinez',
    content: 'Can someone please look at this ASAP? We have investors watching.',
    timestamp: getTimestamp(0, 12),
    isGroup: false,
    priority: 'urgent',
    hasMedia: false,
  },
  
  // Manager Chat
  {
    id: 'wa-012',
    chatName: 'Karen (Manager)',
    sender: 'Karen White',
    content: 'Hey, running 5 mins late to our 1:1. Start without me?',
    timestamp: getTimestamp(0, 35),
    isGroup: false,
    priority: 'medium',
    hasMedia: false,
  },
  {
    id: 'wa-013',
    chatName: 'Karen (Manager)',
    sender: 'Karen White',
    content: 'Also wanted to chat about your Q2 goals today 📝',
    timestamp: getTimestamp(0, 33),
    isGroup: false,
    priority: 'medium',
    hasMedia: false,
  },
  
  // Sales Team Coordination
  {
    id: 'wa-014',
    chatName: 'Sales & Engineering',
    sender: 'Tom (Sales)',
    content: 'Enterprise deal is CLOSING! 🎊 $500K contract signed!',
    timestamp: getTimestamp(2),
    isGroup: true,
    priority: 'medium',
    hasMedia: false,
  },
  {
    id: 'wa-015',
    chatName: 'Sales & Engineering',
    sender: 'Lisa (Sales)',
    content: 'Implementation starts next week. Need engineering kickoff meeting.',
    timestamp: getTimestamp(1, 50),
    isGroup: true,
    priority: 'high',
    hasMedia: false,
  },
  {
    id: 'wa-016',
    chatName: 'Sales & Engineering',
    sender: 'Tom (Sales)',
    content: '@You Can you lead the technical onboarding?',
    timestamp: getTimestamp(1, 48),
    isGroup: true,
    priority: 'high',
    hasMedia: false,
  },
  
  // More Group Chats
  {
    id: 'wa-017',
    chatName: 'Leadership Team',
    sender: 'Robert (CFO)',
    content: 'Board deck is due Monday. Need everyone\'s slides by Friday EOD.',
    timestamp: getTimestamp(3),
    isGroup: true,
    priority: 'high',
    hasMedia: false,
  },
  {
    id: 'wa-018',
    chatName: 'Leadership Team',
    sender: 'Jennifer (CEO)',
    content: '☝️ This is critical. Board is particularly interested in growth metrics.',
    timestamp: getTimestamp(2, 55),
    isGroup: true,
    priority: 'high',
    hasMedia: false,
  },
  
  {
    id: 'wa-019',
    chatName: 'Engineering Team',
    sender: 'Nina',
    content: 'Code freeze starts tomorrow! Final PRs need review today.',
    timestamp: getTimestamp(5),
    isGroup: true,
    priority: 'medium',
    hasMedia: false,
  },
  {
    id: 'wa-020',
    chatName: 'Engineering Team',
    sender: 'Chris',
    content: 'I have 2 PRs pending. Can someone review? 🙏',
    timestamp: getTimestamp(4, 45),
    isGroup: true,
    priority: 'medium',
    hasMedia: false,
  },
  
  // Personal/Casual
  {
    id: 'wa-021',
    chatName: 'Team Lunch Group',
    sender: 'James',
    content: 'Lunch at that new sushi place? 🍣',
    timestamp: getTimestamp(0, 90),
    isGroup: true,
    priority: 'low',
    hasMedia: false,
  },
  {
    id: 'wa-022',
    chatName: 'Team Lunch Group',
    sender: 'Emma',
    content: 'I\'m in! 12:30?',
    timestamp: getTimestamp(0, 88),
    isGroup: true,
    priority: 'low',
    hasMedia: false,
  },
  
  // Client Updates
  {
    id: 'wa-023',
    chatName: 'GlobalCorp - Emily',
    sender: 'Emily Watson',
    content: 'Quick update: Our team loves the new features! When\'s the next release?',
    timestamp: getTimestamp(6),
    isGroup: false,
    priority: 'medium',
    hasMedia: false,
  },
  {
    id: 'wa-024',
    chatName: 'GlobalCorp - Emily',
    sender: 'Emily Watson',
    content: 'Also, can we schedule a QBR for next month?',
    timestamp: getTimestamp(5, 55),
    isGroup: false,
    priority: 'medium',
    hasMedia: false,
  },
  
  // Vendor Communication
  {
    id: 'wa-025',
    chatName: 'AWS Account Manager',
    sender: 'David (AWS)',
    content: 'Noticed your usage spiked 40% this month. Everything okay?',
    timestamp: getTimestamp(8),
    isGroup: false,
    priority: 'medium',
    hasMedia: false,
  },
  {
    id: 'wa-026',
    chatName: 'AWS Account Manager',
    sender: 'David (AWS)',
    content: 'Happy to review optimization opportunities if you want 💡',
    timestamp: getTimestamp(7, 55),
    isGroup: false,
    priority: 'low',
    hasMedia: false,
  },
  
  // More Urgent Items
  {
    id: 'wa-027',
    chatName: 'Security Team Alert',
    sender: 'Security Bot',
    content: '⚠️ ALERT: Unusual login activity detected on production systems',
    timestamp: getTimestamp(0, 40),
    isGroup: true,
    priority: 'urgent',
    hasMedia: false,
  },
  {
    id: 'wa-028',
    chatName: 'Security Team Alert',
    sender: 'Security Bot',
    content: 'Multiple failed login attempts from unknown IP. Investigate immediately.',
    timestamp: getTimestamp(0, 39),
    isGroup: true,
    priority: 'urgent',
    hasMedia: false,
  },
  
  {
    id: 'wa-029',
    chatName: 'Product Team',
    sender: 'Jessica',
    content: 'User testing results are in! 📊 Voice recording available',
    timestamp: getTimestamp(4),
    isGroup: true,
    priority: 'medium',
    hasMedia: true,
  },
  {
    id: 'wa-030',
    chatName: 'Product Team',
    sender: 'Marcus',
    content: 'Overall very positive. Few tweaks needed on the dashboard UI.',
    timestamp: getTimestamp(3, 55),
    isGroup: true,
    priority: 'low',
    hasMedia: false,
  },
];

// Gmail Emails - 25+ realistic emails
export const syntheticGmailEmails: GmailEmail[] = [
  // External Vendor
  {
    id: 'ge-001',
    from: 'GitHub Team <noreply@github.com>',
    to: ['you@gmail.com'],
    subject: '[GitHub] Security alert: New dependency vulnerabilities',
    body: 'Hello,\n\nWe found 8 vulnerabilities in your repository dependencies:\n\n- 3 high severity\n- 5 medium severity\n\nReview and update dependencies to fix these issues.\n\nView full report: https://github.com/your-repo/security',
    timestamp: getTimestamp(4),
    isRead: false,
    priority: 'high',
    category: 'primary',
    labels: ['GitHub', 'Security'],
  },
  
  // Conference/Event
  {
    id: 'ge-002',
    from: 'DevCon 2026 <registration@devcon2026.com>',
    to: ['you@gmail.com'],
    subject: 'Early Bird Tickets Now Available - DevCon 2026',
    body: 'DevCon 2026 is back!\n\nMarch 20-22, 2026 | Austin, Texas\n\n✨ Early bird discount: 40% off\n✨ 50+ technical sessions\n✨ Networking with 3,000+ developers\n\nTopics: AI/ML, Cloud Architecture, DevOps, Security\n\nRegister by Feb 15th to save $400!\n\n[Register Now]',
    timestamp: getTimestamp(10),
    isRead: true,
    priority: 'low',
    category: 'promotions',
    labels: ['Events', 'Professional Development'],
  },
  
  // Newsletter
  {
    id: 'ge-003',
    from: 'TechCrunch <newsletter@techcrunch.com>',
    to: ['you@gmail.com'],
    subject: 'TC Daily: Major startup acquisition, AI breakthrough, and more',
    body: 'Your Daily Tech News\n\nTop Stories:\n🚀 CloudStart acquired by Microsoft for $2.1B\n🤖 New AI model achieves 95% accuracy in code generation\n💰 VC funding rebounds in Q1 2026\n\nTrending: Quantum computing startups raising record amounts\n\nRead more →',
    timestamp: getTimestamp(14),
    isRead: true,
    priority: 'low',
    category: 'updates',
    labels: ['Newsletter', 'Tech News'],
  },
  
  // Customer Feedback
  {
    id: 'ge-004',
    from: 'Customer via Support <support@yourcompany.com>',
    to: ['you@gmail.com'],
    subject: 'Feature Request: Bulk Export Functionality',
    body: 'Hi,\n\nI\'m a customer at DataCorp Inc. We love your product but really need bulk export functionality for our compliance requirements.\n\nCurrent workaround (manual exports) is taking our team 10+ hours weekly.\n\nIs this on your roadmap? Happy to discuss our needs in detail.\n\nBest,\nMark Thompson\nData Manager, DataCorp',
    timestamp: getTimestamp(7),
    isRead: false,
    priority: 'medium',
    category: 'primary',
    labels: ['Customer', 'Feature Request'],
  },
  
  // Partnership
  {
    id: 'ge-005',
    from: 'Integration Partner <partnerships@datatools.com>',
    to: ['you@gmail.com'],
    subject: 'API Partnership Proposal - DataTools',
    body: 'Hello,\n\nWe\'re DataTools, providing analytics solutions to 100K+ businesses.\n\nWe\'d like to integrate with your platform:\n- Mutual customer benefits\n- Joint marketing opportunities\n- Revenue sharing model\n\nOur clients frequently ask for your solution. Interested in exploring partnership?\n\nSchedule a call: [Calendar Link]\n\nBest regards,\nKyle Anderson\nHead of Partnerships',
    timestamp: getTimestamp(16),
    isRead: true,
    priority: 'medium',
    category: 'primary',
    labels: ['Partnership', 'Business'],
  },
  
  // Recruiter
  {
    id: 'ge-006',
    from: 'Sarah Kim <sarah.kim@techrecruiter.com>',
    to: ['you@gmail.com'],
    subject: 'Exciting VP Engineering Opportunity - Series B Startup',
    body: 'Hi,\n\nI came across your profile and think you\'d be perfect for a VP Engineering role at a hot Series B startup.\n\nDetails:\n- $180K-$250K + equity\n- Remote-friendly\n- 20-person eng team\n- AI/ML product\n- Recent $40M funding\n\nInterested in learning more? Completely confidential.\n\nBest,\nSarah',
    timestamp: getTimestamp(19),
    isRead: true,
    priority: 'low',
    category: 'primary',
    labels: ['Recruiting'],
  },
  
  // Industry Update
  {
    id: 'ge-007',
    from: 'AWS Updates <aws-updates@amazon.com>',
    to: ['you@gmail.com'],
    subject: 'New AWS Services Launched - Feb 2026',
    body: 'What\'s New at AWS\n\nNew Services:\n- AWS Lambda Performance Optimization Tools\n- Enhanced CloudWatch Monitoring\n- New EC2 instance types\n\nRegional Expansions:\n- New availability zones in Europe\n\nWebinar: Deep Dive into New Features\nFeb 15, 2026 | 2 PM EST\n\nRegister: [Link]',
    timestamp: getTimestamp(13),
    isRead: true,
    priority: 'low',
    category: 'updates',
    labels: ['AWS', 'Technical'],
  },
  
  // Open Source
  {
    id: 'ge-008',
    from: 'GitHub Notifications <notifications@github.com>',
    to: ['you@gmail.com'],
    subject: '[your-oss-project] Issue #234: Critical bug in authentication',
    body: 'New issue in your-oss-project\n\nUser @devuser123 reported:\n\n"Authentication tokens not refreshing properly, causing users to be logged out unexpectedly. Affects v2.4.0 and later."\n\n15 users have confirmed this issue.\n\nPriority: High\n\nView issue: https://github.com/your-oss-project/issues/234',
    timestamp: getTimestamp(5),
    isRead: false,
    priority: 'high',
    category: 'primary',
    labels: ['GitHub', 'Open Source', 'Bug'],
  },
  
  // Learning/Course
  {
    id: 'ge-009',
    from: 'Udemy <updates@udemy.com>',
    to: ['you@gmail.com'],
    subject: 'New Course: Advanced System Design Patterns',
    body: 'New in Your Field\n\n⭐ Advanced System Design Patterns\nBy Martin Fowler\n\n- Microservices architecture\n- Event-driven systems\n- Scalability patterns\n- Real-world case studies\n\n4.8★ rating | 15 hours | $49.99\n\n[Enroll Now]',
    timestamp: getTimestamp(22),
    isRead: true,
    priority: 'low',
    category: 'promotions',
    labels: ['Learning', 'Professional Development'],
  },
  
  // Financial
  {
    id: 'ge-010',
    from: 'Stripe <notifications@stripe.com>',
    to: ['you@gmail.com'],
    subject: 'Your monthly invoice is ready',
    body: 'Monthly Stripe Statement\n\nInvoice Period: Jan 1-31, 2026\nTotal Transactions: 1,243\nTotal Amount: $45,230\nFees: $1,357\n\nDownload Invoice: [Link]\n\nQuestions? Contact support@stripe.com',
    timestamp: getTimestamp(25),
    isRead: true,
    priority: 'low',
    category: 'updates',
    labels: ['Finance', 'Invoices'],
  },
  
  // More Industry News
  {
    id: 'ge-011',
    from: 'Hacker News Digest <digest@hackernews.com>',
    to: ['you@gmail.com'],
    subject: 'Top HN Stories: Feb 5, 2026',
    body: 'Today\'s Top Stories\n\n1. "Why we moved from microservices back to monolith" (523 points)\n2. "Building a startup as a solo developer" (421 points)\n3. "The state of JavaScript in 2026" (389 points)\n4. "How we reduced AWS costs by 60%" (356 points)\n5. "PostgreSQL 17 released" (298 points)\n\nDiscuss on HN →',
    timestamp: getTimestamp(0, 180),
    isRead: true,
    priority: 'low',
    category: 'updates',
    labels: ['Tech News'],
  },
  
  {
    id: 'ge-012',
    from: 'LinkedIn <notifications@linkedin.com>',
    to: ['you@gmail.com'],
    subject: 'Your network is talking about: AI in production',
    body: 'Popular in Your Network\n\n🔥 "Lessons from deploying AI models at scale"\nBy Alex Chen (former colleague)\n234 reactions | 45 comments\n\n🔥 "Why senior engineers should code less"\nBy Sarah Miller\n189 reactions | 67 comments\n\nView your feed →',
    timestamp: getTimestamp(12),
    isRead: true,
    priority: 'low',
    category: 'social',
    labels: ['LinkedIn', 'Social'],
  },
  
  {
    id: 'ge-013',
    from: 'Stack Overflow <notifications@stackoverflow.com>',
    to: ['you@gmail.com'],
    subject: 'Your question has 3 new answers',
    body: 'New Activity on Your Question\n\n"Best practices for microservice authentication?"\n\n3 new answers since you last checked.\nTop answer has 45 upvotes.\n\nView answers: [Link]',
    timestamp: getTimestamp(9),
    isRead: false,
    priority: 'medium',
    category: 'primary',
    labels: ['Stack Overflow', 'Technical'],
  },
  
  {
    id: 'ge-014',
    from: 'Docker Hub <noreply@dockerhub.com>',
    to: ['you@gmail.com'],
    subject: 'Vulnerability found in your container image',
    body: 'Security Scan Results\n\nImage: your-app:latest\n\nVulnerabilities found:\n- 2 critical\n- 4 high\n- 7 medium\n\nRecommended actions:\n1. Update base image\n2. Update package dependencies\n3. Rescan after fixes\n\nView details: [Link]',
    timestamp: getTimestamp(11),
    isRead: false,
    priority: 'high',
    category: 'primary',
    labels: ['Docker', 'Security'],
  },
  
  {
    id: 'ge-015',
    from: 'Google Cloud <noreply@google.com>',
    to: ['you@gmail.com'],
    subject: 'Cost optimization recommendations available',
    body: 'GCP Cost Optimization\n\nWe\'ve identified potential savings:\n\n💰 $450/month: Right-size VM instances\n💰 $230/month: Use sustained use discounts\n💰 $180/month: Delete unused resources\n\nTotal potential savings: $860/month\n\nView recommendations: [Console Link]',
    timestamp: getTimestamp(17),
    isRead: true,
    priority: 'medium',
    category: 'updates',
    labels: ['Google Cloud', 'Cost'],
  },
  
  {
    id: 'ge-016',
    from: 'Meetup <info@meetup.com>',
    to: ['you@gmail.com'],
    subject: 'New tech meetup near you: AI/ML Engineering',
    body: 'Recommended Meetup\n\nAI/ML Engineering Meetup\nFeb 15, 2026 | 6:30 PM\nTech Hub Downtown\n\nTopic: "Production ML Systems"\nSpeaker: Sarah Johnson, ML Engineer at BigTech\n\n45 people going\n\nRSVP: [Link]',
    timestamp: getTimestamp(21),
    isRead: true,
    priority: 'low',
    category: 'social',
    labels: ['Meetup', 'Events'],
  },
  
  {
    id: 'ge-017',
    from: 'Product Hunt <digest@producthunt.com>',
    to: ['you@gmail.com'],
    subject: '🚀 Top new products today',
    body: 'Product Hunt Daily\n\n#1 DevFlow - AI-powered code review\n#2 CloudMate - Cost optimization tool\n#3 TeamSync - Async communication platform\n#4 CodeGen Pro - AI pair programmer\n#5 DataViz Studio - No-code dashboards\n\nDiscover more →',
    timestamp: getTimestamp(24),
    isRead: true,
    priority: 'low',
    category: 'updates',
    labels: ['Product Hunt'],
  },
  
  {
    id: 'ge-018',
    from: 'Medium Daily Digest <noreply@medium.com>',
    to: ['you@gmail.com'],
    subject: 'Recommended reads: Engineering leadership',
    body: 'Personalized Reading List\n\n📖 "The hidden cost of technical debt" (12 min read)\n📖 "Building high-performing eng teams" (8 min read)\n📖 "Why documentation matters more than code" (6 min read)\n\nBased on your reading history\n\nRead on Medium →',
    timestamp: getTimestamp(26),
    isRead: true,
    priority: 'low',
    category: 'updates',
    labels: ['Medium', 'Reading'],
  },
];

// Calendar Events - 15+ realistic events
export const syntheticCalendarEvents: CalendarEvent[] = [
  // Today's Events
  {
    id: 'ce-001',
    title: 'Daily Standup',
    description: 'Engineering team daily sync',
    startTime: new Date(new Date().setHours(9, 30, 0, 0)),
    endTime: new Date(new Date().setHours(10, 0, 0, 0)),
    attendees: ['Engineering Team'],
    location: 'Teams Meeting',
    isRecurring: true,
    priority: 'medium',
    meetingLink: 'https://teams.microsoft.com/l/meetup-join/...',
    organizer: 'Alex Chen',
    requiresPrep: false,
  },
  {
    id: 'ce-002',
    title: '🔴 URGENT: Production Issue Review',
    description: 'Post-mortem for this morning\'s outage. Need to identify root cause and prevention strategies.',
    startTime: new Date(new Date().setHours(11, 0, 0, 0)),
    endTime: new Date(new Date().setHours(12, 0, 0, 0)),
    attendees: ['Engineering Leadership', 'DevOps Team', 'CTO'],
    location: 'Conference Room A / Zoom',
    isRecurring: false,
    priority: 'urgent',
    meetingLink: 'https://zoom.us/j/1234567890',
    organizer: 'Michael Chen (CTO)',
    requiresPrep: true,
  },
  {
    id: 'ce-003',
    title: 'Q1 Budget Review',
    description: 'Finance committee review of Q1 budget allocations. Bring variance explanations and Q2 forecasts.',
    startTime: new Date(new Date().setHours(14, 0, 0, 0)),
    endTime: new Date(new Date().setHours(15, 30, 0, 0)),
    attendees: ['Finance Team', 'Department Heads', 'CFO', 'CEO'],
    location: 'Executive Conference Room',
    isRecurring: false,
    priority: 'urgent',
    organizer: 'David Park (Finance)',
    requiresPrep: true,
  },
  {
    id: 'ce-004',
    title: 'Client Call - Acme Corp',
    description: 'Timeline discussion for enterprise implementation. Their CTO will join.',
    startTime: new Date(new Date().setHours(15, 0, 0, 0)),
    endTime: new Date(new Date().setHours(15, 45, 0, 0)),
    attendees: ['Sarah Johnson (Acme)', 'CTO (Acme)', 'Sales Team', 'You'],
    location: 'Zoom',
    isRecurring: false,
    priority: 'high',
    meetingLink: 'https://zoom.us/j/9876543210',
    organizer: 'Lisa Chen (Sales)',
    requiresPrep: true,
  },
  {
    id: 'ce-005',
    title: '1:1 with Direct Report - James',
    description: 'Weekly 1:1. James wants to discuss career development.',
    startTime: new Date(new Date().setHours(16, 30, 0, 0)),
    endTime: new Date(new Date().setHours(17, 0, 0, 0)),
    attendees: ['James Park', 'You'],
    location: 'Your Office / Teams',
    isRecurring: true,
    priority: 'medium',
    organizer: 'You',
    requiresPrep: false,
  },
  
  // Tomorrow's Events
  {
    id: 'ce-006',
    title: 'Q1 Strategy Review',
    description: 'Quarterly business review with leadership team. Board meeting prep.',
    startTime: new Date(new Date(new Date().setDate(new Date().getDate() + 1)).setHours(10, 0, 0, 0)),
    endTime: new Date(new Date(new Date().setDate(new Date().getDate() + 1)).setHours(12, 0, 0, 0)),
    attendees: ['Leadership Team', 'CEO', 'Board Observer'],
    location: 'Executive Conference Room',
    isRecurring: false,
    priority: 'urgent',
    organizer: 'Jennifer Brooks (CEO)',
    requiresPrep: true,
  },
  {
    id: 'ce-007',
    title: 'Architecture Review - New Microservice',
    description: 'Review Nina\'s proposal for the new payment processing microservice.',
    startTime: new Date(new Date(new Date().setDate(new Date().getDate() + 1)).setHours(14, 0, 0, 0)),
    endTime: new Date(new Date(new Date().setDate(new Date().getDate() + 1)).setHours(15, 30, 0, 0)),
    attendees: ['Nina Patel', 'Chris Lee', 'Alex Chen', 'You'],
    location: 'Teams Meeting',
    isRecurring: false,
    priority: 'high',
    meetingLink: 'https://teams.microsoft.com/l/meetup-join/...',
    organizer: 'Nina Patel',
    requiresPrep: true,
  },
  {
    id: 'ce-008',
    title: 'All-Hands Meeting',
    description: 'Company-wide meeting. Q1 results and Q2 strategy announcement.',
    startTime: new Date(new Date(new Date().setDate(new Date().getDate() + 1)).setHours(16, 0, 0, 0)),
    endTime: new Date(new Date(new Date().setDate(new Date().getDate() + 1)).setHours(17, 0, 0, 0)),
    attendees: ['All Company'],
    location: 'Main Auditorium / Zoom Webinar',
    isRecurring: false,
    priority: 'high',
    meetingLink: 'https://zoom.us/j/allhands',
    organizer: 'Jennifer Brooks (CEO)',
    requiresPrep: false,
  },
  
  // This Week
  {
    id: 'ce-009',
    title: 'Sprint Planning',
    description: 'Plan next 2-week sprint. Review backlog and capacity.',
    startTime: new Date(new Date(new Date().setDate(new Date().getDate() + 2)).setHours(10, 0, 0, 0)),
    endTime: new Date(new Date(new Date().setDate(new Date().getDate() + 2)).setHours(12, 0, 0, 0)),
    attendees: ['Engineering Team', 'Product Team'],
    location: 'Conference Room B',
    isRecurring: true,
    priority: 'high',
    organizer: 'Jessica Wang (Product)',
    requiresPrep: true,
  },
  {
    id: 'ce-010',
    title: 'Security Audit Follow-up',
    description: 'Review remediation progress on security audit findings.',
    startTime: new Date(new Date(new Date().setDate(new Date().getDate() + 2)).setHours(15, 0, 0, 0)),
    endTime: new Date(new Date(new Date().setDate(new Date().getDate() + 2)).setHours(16, 0, 0, 0)),
    attendees: ['Security Team', 'Engineering Leads', 'CTO'],
    location: 'Teams Meeting',
    isRecurring: false,
    priority: 'high',
    meetingLink: 'https://teams.microsoft.com/l/meetup-join/...',
    organizer: 'Security Team',
    requiresPrep: true,
  },
  {
    id: 'ce-011',
    title: 'Tech Strategy Session',
    description: 'Discuss AI integration roadmap and infrastructure modernization.',
    startTime: new Date(new Date(new Date().setDate(new Date().getDate() + 3)).setHours(14, 0, 0, 0)),
    endTime: new Date(new Date(new Date().setDate(new Date().getDate() + 3)).setHours(16, 0, 0, 0)),
    attendees: ['Engineering Leadership', 'CTO', 'Product Leadership'],
    location: 'Executive Conference Room',
    isRecurring: false,
    priority: 'high',
    organizer: 'Michael Chen (CTO)',
    requiresPrep: true,
  },
  {
    id: 'ce-012',
    title: 'Client Demo - TechCorp',
    description: 'Enterprise demo for potential $500K deal. CTO specifically requested technical lead.',
    startTime: new Date(new Date(new Date().setDate(new Date().getDate() + 3)).setHours(16, 0, 0, 0)),
    endTime: new Date(new Date(new Date().setDate(new Date().getDate() + 3)).setHours(17, 0, 0, 0)),
    attendees: ['TechCorp Team', 'Sales Team', 'You'],
    location: 'Zoom',
    isRecurring: false,
    priority: 'urgent',
    meetingLink: 'https://zoom.us/j/techcorp-demo',
    organizer: 'Tom Rodriguez (Sales)',
    requiresPrep: true,
  },
  {
    id: 'ce-013',
    title: '1:1 with Manager',
    description: 'Weekly 1:1 with Karen. Performance review prep and Q2 goals.',
    startTime: new Date(new Date(new Date().setDate(new Date().getDate() + 4)).setHours(15, 0, 0, 0)),
    endTime: new Date(new Date(new Date().setDate(new Date().getDate() + 4)).setHours(15, 30, 0, 0)),
    attendees: ['Karen White', 'You'],
    location: 'Karen\'s Office',
    isRecurring: true,
    priority: 'high',
    organizer: 'Karen White',
    requiresPrep: false,
  },
  
  // Recurring Focus Blocks
  {
    id: 'ce-014',
    title: '🔒 Focus Time - Deep Work',
    description: 'Protected time for code reviews and strategic planning. No meetings.',
    startTime: new Date(new Date(new Date().setDate(new Date().getDate() + 1)).setHours(9, 0, 0, 0)),
    endTime: new Date(new Date(new Date().setDate(new Date().getDate() + 1)).setHours(11, 0, 0, 0)),
    attendees: ['You'],
    location: 'Work from Home',
    isRecurring: true,
    priority: 'high',
    organizer: 'You',
    requiresPrep: false,
  },
  {
    id: 'ce-015',
    title: 'Hiring Committee - Senior Engineer',
    description: 'Final round interviews for 3 candidates. Need to make offer decision.',
    startTime: new Date(new Date(new Date().setDate(new Date().getDate() + 5)).setHours(13, 0, 0, 0)),
    endTime: new Date(new Date(new Date().setDate(new Date().getDate() + 5)).setHours(15, 0, 0, 0)),
    attendees: ['Hiring Committee', 'HR', 'You'],
    location: 'Conference Room C',
    isRecurring: false,
    priority: 'high',
    organizer: 'Alex Chen',
    requiresPrep: true,
  },
];

// Export all synthetic data
export const syntheticData = {
  teams: syntheticTeamsMessages,
  outlook: syntheticOutlookEmails,
  whatsapp: syntheticWhatsAppMessages,
  gmail: syntheticGmailEmails,
  calendar: syntheticCalendarEvents,
};

// Summary statistics
export const getSyntheticDataStats = () => {
  return {
    totalMessages: syntheticTeamsMessages.length + 
                   syntheticOutlookEmails.length + 
                   syntheticWhatsAppMessages.length + 
                   syntheticGmailEmails.length,
    teamsMessages: syntheticTeamsMessages.length,
    outlookEmails: syntheticOutlookEmails.length,
    whatsappMessages: syntheticWhatsAppMessages.length,
    gmailEmails: syntheticGmailEmails.length,
    calendarEvents: syntheticCalendarEvents.length,
    urgentItems: [
      ...syntheticTeamsMessages.filter(m => m.priority === 'urgent'),
      ...syntheticOutlookEmails.filter(e => e.priority === 'urgent'),
      ...syntheticWhatsAppMessages.filter(m => m.priority === 'urgent'),
      ...syntheticCalendarEvents.filter(e => e.priority === 'urgent'),
    ].length,
  };
};
