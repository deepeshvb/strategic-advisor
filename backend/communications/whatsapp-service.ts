import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.backend' });

interface WhatsAppMessage {
  to: string;
  body: string;
  urgent?: boolean;
}

class WhatsAppService {
  private client: twilio.Twilio;
  private fromNumber: string;
  private ceoNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
    this.ceoNumber = `whatsapp:${process.env.CEO_WHATSAPP_NUMBER}`;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    this.client = twilio(accountSid, authToken);
  }

  /**
   * Send a WhatsApp message to the CEO
   */
  async sendMessage(message: WhatsAppMessage): Promise<void> {
    try {
      const urgencyEmoji = message.urgent ? '🚨 ' : '📱 ';
      
      const result = await this.client.messages.create({
        from: this.fromNumber,
        to: message.to || this.ceoNumber,
        body: urgencyEmoji + message.body,
      });

      console.log(`✅ WhatsApp sent: ${result.sid}`);
    } catch (error) {
      console.error('❌ WhatsApp error:', error);
      throw error;
    }
  }

  /**
   * Send a critical alert via WhatsApp
   */
  async sendCriticalAlert(title: string, details: string): Promise<void> {
    const message = `🚨 CRITICAL ALERT

${title}

${details}

Reply 'details' for more information.`;

    await this.sendMessage({
      to: this.ceoNumber,
      body: message,
      urgent: true,
    });
  }

  /**
   * Send a daily briefing via WhatsApp
   */
  async sendBriefing(summary: string): Promise<void> {
    const message = `☀️ Morning Briefing

${summary}

Reply 'brief' for full details.`;

    await this.sendMessage({
      to: this.ceoNumber,
      body: message,
      urgent: false,
    });
  }

  /**
   * Handle incoming WhatsApp messages from CEO
   * Returns the message body
   */
  async handleIncomingMessage(from: string, body: string): Promise<string> {
    console.log(`📥 WhatsApp from ${from}: ${body}`);
    return body;
  }

  /**
   * Send a response to CEO's WhatsApp message
   */
  async sendResponse(response: string): Promise<void> {
    await this.sendMessage({
      to: this.ceoNumber,
      body: response,
      urgent: false,
    });
  }
}

export const whatsappService = new WhatsAppService();
