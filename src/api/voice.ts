/**
 * Voice API Endpoints
 * RESTful API for Siri Shortcuts and voice integrations
 */

import express from 'express';
import cors from 'cors';
import { voiceResponseService } from '../services/voiceResponseService';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.text());

/**
 * GET /api/voice/critical
 * Returns critical items formatted for voice
 */
app.get('/api/voice/critical', async (req, res) => {
  try {
    const response = await voiceResponseService.getCriticalItemsVoice();
    res.json({
      text: response.text,
      priority: response.priority,
      timestamp: response.timestamp,
      itemCount: response.itemCount,
    });
  } catch (error) {
    console.error('Error getting critical items:', error);
    res.status(500).json({
      text: 'Sorry, I encountered an error retrieving critical items.',
      priority: 'normal',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /api/voice/summary
 * Returns daily summary formatted for voice
 */
app.get('/api/voice/summary', async (req, res) => {
  try {
    const response = await voiceResponseService.getDailySummaryVoice();
    res.json({
      text: response.text,
      priority: response.priority,
      timestamp: response.timestamp,
      itemCount: response.itemCount,
    });
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({
      text: 'Sorry, I encountered an error retrieving your summary.',
      priority: 'normal',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /api/voice/status
 * Returns system status formatted for voice
 */
app.get('/api/voice/status', async (req, res) => {
  try {
    const response = await voiceResponseService.getStatusVoice();
    res.json({
      text: response.text,
      priority: response.priority,
      timestamp: response.timestamp,
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      text: 'Sorry, I encountered an error checking system status.',
      priority: 'normal',
      timestamp: new Date(),
    });
  }
});

/**
 * POST /api/voice/query
 * Process natural language query
 * Body: { "query": "what's critical?" }
 */
app.post('/api/voice/query', async (req, res) => {
  try {
    const query = typeof req.body === 'string' ? req.body : req.body.query;
    
    if (!query) {
      return res.status(400).json({
        text: 'Please provide a query.',
        priority: 'normal',
        timestamp: new Date(),
      });
    }
    
    const response = await voiceResponseService.processQueryVoice(query);
    res.json({
      text: response.text,
      priority: response.priority,
      timestamp: response.timestamp,
      itemCount: response.itemCount,
    });
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({
      text: 'Sorry, I encountered an error processing your query.',
      priority: 'normal',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /api/voice/briefing/:timeOfDay
 * Get scheduled briefing (morning, midday, evening)
 */
app.get('/api/voice/briefing/:timeOfDay', async (req, res) => {
  try {
    const { timeOfDay } = req.params;
    
    if (!['morning', 'midday', 'evening'].includes(timeOfDay)) {
      return res.status(400).json({
        text: 'Invalid time of day. Use morning, midday, or evening.',
        priority: 'normal',
        timestamp: new Date(),
      });
    }
    
    const response = await voiceResponseService.getProactiveInsightVoice(
      timeOfDay as 'morning' | 'midday' | 'evening'
    );
    
    res.json({
      text: response.text,
      priority: response.priority,
      timestamp: response.timestamp,
      itemCount: response.itemCount,
    });
  } catch (error) {
    console.error('Error getting briefing:', error);
    res.status(500).json({
      text: 'Sorry, I encountered an error retrieving your briefing.',
      priority: 'normal',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /api/voice/health
 * Health check endpoint
 */
app.get('/api/voice/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    endpoints: [
      '/api/voice/critical',
      '/api/voice/summary',
      '/api/voice/status',
      '/api/voice/query',
      '/api/voice/briefing/:timeOfDay',
    ],
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Voice API Server running on http://localhost:${PORT}`);
  console.log(`📱 Available endpoints:`);
  console.log(`   GET  /api/voice/critical - Get critical items`);
  console.log(`   GET  /api/voice/summary - Get daily summary`);
  console.log(`   GET  /api/voice/status - Get system status`);
  console.log(`   POST /api/voice/query - Process voice query`);
  console.log(`   GET  /api/voice/briefing/:timeOfDay - Get scheduled briefing`);
  console.log(`   GET  /api/voice/health - Health check`);
});

export default app;
