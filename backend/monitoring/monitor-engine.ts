import cron from 'node-cron';
import { claudeService } from '../agi/claude-service.js';
import { whatsappService } from '../communications/whatsapp-service.js';
import { smsService } from '../communications/sms-service.js';
import { emailService } from '../communications/email-service.js';
import { voiceService } from '../communications/voice-service.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.backend' });

interface MonitoringConfig {
  intervalMinutes: number;
  alertOnlyUrgent: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

class MonitoringEngine {
  private config: MonitoringConfig;
  private isRunning: boolean = false;
  private cronJob: any = null;

  constructor() {
    this.config = {
      intervalMinutes: parseInt(process.env.MONITORING_INTERVAL_MINUTES || '15'),
      alertOnlyUrgent: process.env.ALERT_ONLY_URGENT === 'true',
      quietHoursEnabled: process.env.QUIET_HOURS_ENABLED === 'true',
      quietHoursStart: process.env.QUIET_HOURS_START || '22:00',
      quietHoursEnd: process.env.QUIET_HOURS_END || '07:00',
    };
  }

  /**
   * Start the monitoring service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Monitoring already running');
      return;
    }

    console.log('🚀 Starting 24/7 AGI Monitoring Service...');
    console.log(`📊 Monitoring interval: ${this.config.intervalMinutes} minutes`);
    console.log(`🔕 Quiet hours: ${this.config.quietHoursEnabled ? `${this.config.quietHoursStart} - ${this.config.quietHoursEnd}` : 'Disabled'}`);

    this.isRunning = true;

    // Send startup notification
    await whatsappService.sendMessage({
      to: `whatsapp:${process.env.CEO_PHONE_NUMBER}`,
      body: `🤖 Strategic AI Advisor is now online!\n\nMonitoring all channels every ${this.config.intervalMinutes} minutes.\n\nReply anytime with questions or commands:\n• "brief" - Get current status\n• "critical" - Show urgent items\n• "help" - See all commands`,
      urgent: false,
    });

    // Schedule monitoring checks
    const cronExpression = `*/${this.config.intervalMinutes} * * * *`;
    this.cronJob = cron.schedule(cronExpression, () => {
      this.runMonitoringCycle().catch(error => {
        console.error('❌ Monitoring cycle error:', error);
      });
    });

    // Schedule morning briefing (8 AM)
    cron.schedule('0 8 * * *', () => {
      this.sendMorningBriefing().catch(error => {
        console.error('❌ Morning briefing error:', error);
      });
    });

    // Schedule evening summary (6 PM)
    cron.schedule('0 18 * * *', () => {
      this.sendEveningSummary().catch(error => {
        console.error('❌ Evening summary error:', error);
      });
    });

    // Run initial check
    await this.runMonitoringCycle();

    console.log('✅ Monitoring service started successfully!');
  }

  /**
   * Stop the monitoring service
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
    }
    this.isRunning = false;
    console.log('🛑 Monitoring service stopped');
  }

  /**
   * Run a single monitoring cycle
   */
  private async runMonitoringCycle(): Promise<void> {
    console.log('🔄 Running monitoring cycle...');

    // Check if we're in quiet hours
    if (this.isQuietHours()) {
      console.log('🔕 Quiet hours - skipping alerts');
      return;
    }

    try {
      // 1. Scan all channels
      const channelData = await this.scanAllChannels();

      // 2. Use Claude to analyze and detect urgent items
      const analysis = await claudeService.analyzeMonitoringData(channelData);

      console.log(`📊 Analysis complete: ${analysis.urgentItems.length} urgent items, urgency score: ${analysis.urgencyScore}/10`);

      // 3. Send alerts based on urgency
      if (analysis.urgencyScore >= 10) {
        // CRITICAL: Voice call + SMS + WhatsApp
        await this.sendCriticalAlert(analysis);
      } else if (analysis.urgencyScore >= 9) {
        // HIGH: SMS + WhatsApp
        await this.sendHighAlert(analysis);
      } else if (analysis.urgencyScore >= 8) {
        // MEDIUM: WhatsApp only
        await this.sendMediumAlert(analysis);
      } else {
        console.log('✅ No urgent items detected');
      }
    } catch (error) {
      console.error('❌ Monitoring cycle error:', error);
    }
  }

  /**
   * Scan all configured channels
   */
  private async scanAllChannels(): Promise<any> {
    // TODO: Implement actual channel scanning
    // For now, return mock structure
    return {
      teams: {
        unreadMessages: 0,
        mentions: [],
        conflicts: [],
      },
      email: {
        unreadCount: 0,
        urgent: [],
        actionItems: [],
      },
      calendar: {
        todayMeetings: [],
        conflicts: [],
        upcomingDeadlines: [],
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send critical alert (urgency 10)
   */
  private async sendCriticalAlert(analysis: any): Promise<void> {
    console.log('🚨 CRITICAL ALERT detected!');

    const alertMessage = `CRITICAL ISSUE DETECTED\n\n${analysis.summary}\n\nImmediate action required!`;

    // 1. Voice call
    await voiceService.makeEmergencyCall(analysis.summary);

    // 2. SMS
    await smsService.sendCriticalSMS(alertMessage);

    // 3. WhatsApp (with details)
    await whatsappService.sendCriticalAlert(
      'EMERGENCY - Immediate Attention Required',
      analysis.summary
    );
  }

  /**
   * Send high alert (urgency 9)
   */
  private async sendHighAlert(analysis: any): Promise<void> {
    console.log('⚠️ High urgency alert');

    // SMS + WhatsApp
    await smsService.sendUrgentAlert(
      'High Priority Issue',
      analysis.summary
    );

    await whatsappService.sendMessage({
      to: `whatsapp:${process.env.CEO_PHONE_NUMBER}`,
      body: `⚠️ HIGH PRIORITY\n\n${analysis.summary}\n\nUrgent items:\n${analysis.urgentItems.map((item: any, i: number) => `${i + 1}. ${item.title}`).join('\n')}`,
      urgent: true,
    });
  }

  /**
   * Send medium alert (urgency 8)
   */
  private async sendMediumAlert(analysis: any): Promise<void> {
    console.log('📌 Medium urgency alert');

    // WhatsApp only
    await whatsappService.sendMessage({
      to: `whatsapp:${process.env.CEO_PHONE_NUMBER}`,
      body: `📌 Needs Attention\n\n${analysis.summary}`,
      urgent: false,
    });
  }

  /**
   * Send morning briefing
   */
  private async sendMorningBriefing(): Promise<void> {
    console.log('☀️ Sending morning briefing...');

    const channelData = await this.scanAllChannels();
    const analysis = await claudeService.analyzeMonitoringData(channelData);

    // Email
    await emailService.sendMorningBriefing(
      analysis.summary,
      analysis.urgentItems
    );

    // WhatsApp
    await whatsappService.sendBriefing(analysis.summary);
  }

  /**
   * Send evening summary
   */
  private async sendEveningSummary(): Promise<void> {
    console.log('🌙 Sending evening summary...');

    const channelData = await this.scanAllChannels();
    
    // TODO: Get achievements and next steps
    const achievements = ['Sample achievement 1', 'Sample achievement 2'];
    const nextSteps = ['Sample priority 1', 'Sample priority 2'];

    await emailService.sendEveningSummary(
      'Today was productive. Key activities completed.',
      achievements,
      nextSteps
    );
  }

  /**
   * Check if we're in quiet hours
   */
  private isQuietHours(): boolean {
    if (!this.config.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return currentTime >= this.config.quietHoursStart || currentTime < this.config.quietHoursEnd;
  }

  /**
   * Handle incoming WhatsApp message from CEO
   */
  async handleCEOMessage(message: string): Promise<string> {
    console.log(`📥 CEO message: ${message}`);

    const lowerMessage = message.toLowerCase().trim();

    // Handle commands
    if (lowerMessage === 'brief' || lowerMessage === 'briefing') {
      const channelData = await this.scanAllChannels();
      const analysis = await claudeService.analyzeMonitoringData(channelData);
      return `📊 Current Status:\n\n${analysis.summary}\n\nUrgent items: ${analysis.urgentItems.length}`;
    }

    if (lowerMessage === 'critical' || lowerMessage === 'urgent') {
      const channelData = await this.scanAllChannels();
      const analysis = await claudeService.analyzeMonitoringData(channelData);
      const criticalItems = analysis.urgentItems.filter((item: any) => item.urgency >= 8);
      
      if (criticalItems.length === 0) {
        return '✅ No critical items at the moment. All clear!';
      }

      return `🚨 ${criticalItems.length} Critical Items:\n\n${criticalItems.map((item: any, i: number) => 
        `${i + 1}. ${item.title}\n   ${item.description}`
      ).join('\n\n')}`;
    }

    if (lowerMessage === 'call' || lowerMessage === 'call me') {
      const channelData = await this.scanAllChannels();
      const analysis = await claudeService.analyzeMonitoringData(channelData);
      await voiceService.makeBriefingCall(analysis.summary);
      return '📞 Calling you now with the briefing...';
    }

    if (lowerMessage === 'help' || lowerMessage === 'commands') {
      return `🤖 Available Commands:

• "brief" - Get current status
• "critical" - Show urgent items
• "call" - Call me with briefing
• "help" - Show this menu

Or just ask me anything! I'm here to help.`;
    }

    // Default: Use Claude to respond to the query
    const channelData = await this.scanAllChannels();
    const context = JSON.stringify(channelData, null, 2);
    const response = await claudeService.analyzeQuery(message, context);

    return response.content;
  }
}

export const monitoringEngine = new MonitoringEngine();
