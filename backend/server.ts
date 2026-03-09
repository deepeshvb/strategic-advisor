import express from 'express';
import dotenv from 'dotenv';
import { monitoringEngine } from './monitoring/monitor-engine.js';
import { whatsappService } from './communications/whatsapp-service.js';

dotenv.config({ path: '.env.backend' });

const app = express();
const PORT = process.env.BACKEND_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'running',
    service: 'Strategic AI Advisor - Backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Twilio webhook for incoming WhatsApp messages
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const { From, Body } = req.body;
    
    console.log(`📥 WhatsApp webhook - From: ${From}, Body: ${Body}`);

    // Process the message and get AI response
    const response = await monitoringEngine.handleCEOMessage(Body);

    // Send response back via WhatsApp
    await whatsappService.sendResponse(response);

    // Respond to Twilio webhook
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ WhatsApp webhook error:', error);
    res.status(500).send('Error');
  }
});

// Twilio webhook for incoming SMS
app.post('/webhook/sms', async (req, res) => {
  try {
    const { From, Body } = req.body;
    
    console.log(`📥 SMS webhook - From: ${From}, Body: ${Body}`);

    // Process via monitoring engine
    const response = await monitoringEngine.handleCEOMessage(Body);

    // Send response back
    await whatsappService.sendResponse(response);

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ SMS webhook error:', error);
    res.status(500).send('Error');
  }
});

// Manual trigger endpoint (for testing)
app.post('/api/trigger-check', async (req, res) => {
  try {
    console.log('🔄 Manual monitoring check triggered');
    // This will be handled by the monitoring engine
    res.json({ status: 'triggered', message: 'Monitoring check started' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger check' });
  }
});

// Configuration endpoint
app.get('/api/config', (req, res) => {
  res.json({
    intervalMinutes: process.env.MONITORING_INTERVAL_MINUTES,
    alertOnlyUrgent: process.env.ALERT_ONLY_URGENT,
    quietHoursEnabled: process.env.QUIET_HOURS_ENABLED,
    ceoPhone: process.env.CEO_PHONE_NUMBER,
  });
});

// Start the server
async function startServer() {
  try {
    console.log('============================================');
    console.log('  STRATEGIC AI ADVISOR - BACKEND SERVICE');
    console.log('============================================\n');

    // Start monitoring engine
    await monitoringEngine.start();

    // Start Express server for webhooks
    app.listen(PORT, () => {
      console.log(`\n✅ Backend server running on port ${PORT}`);
      console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook/whatsapp`);
      console.log(`🔍 Health check: http://localhost:${PORT}/health\n`);
      console.log('🤖 AGI Monitoring Service is now active!');
      console.log('📱 You can now text or WhatsApp: ' + process.env.CEO_PHONE_NUMBER);
      console.log('\n============================================\n');
    });
  } catch (error) {
    console.error('❌ Failed to start backend service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  monitoringEngine.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  monitoringEngine.stop();
  process.exit(0);
});

// Start the service
startServer();
