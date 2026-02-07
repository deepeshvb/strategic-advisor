/**
 * Simple Express server to serve Voice API
 * Run alongside Vite dev server
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.text());

// Mock monitoring data (in production, this would query your real data)
const getMockCriticalItems = () => {
  return [
    {
      id: '1',
      title: 'Customer escalation from ABC Corp',
      summary: 'Requires response by 3 PM today',
      priority: 'critical',
    },
    {
      id: '2',
      title: 'Engineering deploy blocked',
      summary: 'Needs your approval to proceed',
      priority: 'critical',
    },
  ];
};

/**
 * GET /api/voice/critical
 * Returns critical items as speakable text
 */
app.get('/api/voice/critical', (req, res) => {
  const items = getMockCriticalItems();
  
  if (items.length === 0) {
    return res.json({
      text: 'You have no critical items requiring immediate attention.',
      priority: 'normal',
      itemCount: 0,
    });
  }
  
  if (items.length === 1) {
    return res.json({
      text: `You have 1 critical item: ${items[0].title}. ${items[0].summary}.`,
      priority: 'critical',
      itemCount: 1,
    });
  }
  
  const itemsList = items.slice(0, 3).map((item, idx) => 
    `${idx + 1}. ${item.title}.`
  ).join(' ');
  
  res.json({
    text: `You have ${items.length} critical items. ${itemsList}`,
    priority: 'critical',
    itemCount: items.length,
  });
});

/**
 * GET /api/voice/summary
 * Returns daily summary
 */
app.get('/api/voice/summary', (req, res) => {
  res.json({
    text: 'Good morning. You have 2 critical items and 5 high-priority items requiring attention today. Your top priority is the customer escalation from ABC Corp.',
    priority: 'critical',
    itemCount: 7,
  });
});

/**
 * GET /api/voice/status  
 * Returns system status
 */
app.get('/api/voice/status', (req, res) => {
  res.json({
    text: 'System status: Monitoring is active. Tracking 3 companies. Last update: 2 minutes ago.',
    priority: 'normal',
  });
});

/**
 * POST /api/voice/query
 * Process natural language query
 */
app.post('/api/voice/query', (req, res) => {
  const query = req.body.query || req.body;
  const lowerQuery = String(query).toLowerCase();
  
  if (lowerQuery.includes('critical') || lowerQuery.includes('urgent')) {
    return res.json({
      text: 'You have 2 critical items: customer escalation and engineering deploy.',
      priority: 'critical',
    });
  }
  
  if (lowerQuery.includes('status')) {
    return res.json({
      text: 'All systems operational. Monitoring 3 companies.',
      priority: 'normal',
    });
  }
  
  res.json({
    text: 'I can help with critical items, summaries, or system status. What would you like to know?',
    priority: 'normal',
  });
});

/**
 * GET /api/voice/briefing/:timeOfDay
 * Scheduled briefings
 */
app.get('/api/voice/briefing/:timeOfDay', (req, res) => {
  const { timeOfDay } = req.params;
  
  let text = '';
  if (timeOfDay === 'morning') {
    text = 'Good morning. You have 2 critical items requiring attention today.';
  } else if (timeOfDay === 'midday') {
    text = 'Midday check-in. 1 critical item remains. No new urgent issues detected.';
  } else if (timeOfDay === 'evening') {
    text = 'End of day summary. All critical items addressed. Good work today.';
  } else {
    text = 'Invalid time of day.';
  }
  
  res.json({ text, priority: 'normal' });
});

/**
 * GET /api/voice/health
 * Health check
 */
app.get('/api/voice/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET  /api/voice/critical',
      'GET  /api/voice/summary',
      'GET  /api/voice/status',
      'POST /api/voice/query',
      'GET  /api/voice/briefing/:timeOfDay',
    ],
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('✅ Voice API Server Started!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log('');
  console.log('📱 Siri Endpoints:');
  console.log(`   GET  http://localhost:${PORT}/api/voice/critical`);
  console.log(`   GET  http://localhost:${PORT}/api/voice/summary`);
  console.log(`   GET  http://localhost:${PORT}/api/voice/status`);
  console.log(`   POST http://localhost:${PORT}/api/voice/query`);
  console.log('');
  console.log('🎤 Test with curl:');
  console.log(`   curl http://localhost:${PORT}/api/voice/critical`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});
