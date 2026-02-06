/**
 * Express API Server for Voice Endpoints
 * 
 * Provides REST API for Siri Shortcuts integration
 */

import express from 'express';
import cors from 'cors';
import {
  getCriticalItems,
  getDailySummary,
  getStatus,
  processQuery,
  getBriefing
} from './voice';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Strategic Advisor API is running',
    timestamp: new Date().toISOString()
  });
});

// Voice API endpoints
app.get('/api/voice/critical', getCriticalItems);
app.get('/api/voice/summary', getDailySummary);
app.get('/api/voice/status', getStatus);
app.get('/api/voice/briefing', getBriefing);
app.post('/api/voice/query', processQuery);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({
    success: false,
    text: 'An unexpected error occurred. Please try again.'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Voice API server running on http://localhost:${PORT}`);
  console.log(`Endpoints available:`);
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/voice/critical`);
  console.log(`  GET  /api/voice/summary`);
  console.log(`  GET  /api/voice/status`);
  console.log(`  GET  /api/voice/briefing?type=morning|evening`);
  console.log(`  POST /api/voice/query`);
});

export default app;
