import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.backend' });

class SMSService {
  private client: twilio.Twilio;
  private fromNumber: string;
  private ceoNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
    this.ceoNumber = process.env.CEO_PHONE_NUMBER || '';

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    this.client = twilio(accountSid, authToken);
  }

  /**
   * Send SMS (CRITICAL ISSUES ONLY)
   */
  async sendCriticalSMS(message: string): Promise<void> {
    try {
      const result = await this.client.messages.create({
        from: this.fromNumber,
        to: this.ceoNumber,
        body: `🚨 CRITICAL: ${message}`,
      });

      console.log(`✅ SMS sent: ${result.sid}`);
    } catch (error) {
      console.error('❌ SMS error:', error);
      throw error;
    }
  }

  /**
   * Send urgent alert via SMS
   */
  async sendUrgentAlert(title: string, details: string): Promise<void> {
    const message = `${title}\n\n${details}\n\nReply via WhatsApp for more info.`;
    await this.sendCriticalSMS(message);
  }
}

export const smsService = new SMSService();
