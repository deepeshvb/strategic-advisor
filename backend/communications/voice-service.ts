import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.backend' });

class VoiceService {
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
   * Make a voice call to CEO (CRITICAL EMERGENCIES ONLY)
   */
  async makeEmergencyCall(message: string): Promise<void> {
    try {
      const twiml = `
        <Response>
          <Say voice="Polly.Matthew-Neural">
            Emergency alert. ${message}. 
            This is your Strategic AI Advisor. 
            Check WhatsApp for full details.
          </Say>
          <Pause length="1"/>
          <Say voice="Polly.Matthew-Neural">
            Repeating. ${message}.
          </Say>
        </Response>
      `;

      const call = await this.client.calls.create({
        from: this.fromNumber,
        to: this.ceoNumber,
        twiml: twiml,
      });

      console.log(`✅ Voice call initiated: ${call.sid}`);
    } catch (error) {
      console.error('❌ Voice call error:', error);
      throw error;
    }
  }

  /**
   * Make a briefing call (when requested via WhatsApp)
   */
  async makeBriefingCall(briefing: string): Promise<void> {
    try {
      // Split briefing into chunks for natural speech
      const chunks = this.splitForSpeech(briefing);
      
      const sayStatements = chunks.map(chunk => 
        `<Say voice="Polly.Matthew-Neural">${this.escapeXml(chunk)}</Say><Pause length="1"/>`
      ).join('');

      const twiml = `
        <Response>
          <Say voice="Polly.Matthew-Neural">
            Good morning. This is your Strategic AI Advisor with your daily briefing.
          </Say>
          <Pause length="1"/>
          ${sayStatements}
          <Say voice="Polly.Matthew-Neural">
            End of briefing. Have a productive day.
          </Say>
        </Response>
      `;

      const call = await this.client.calls.create({
        from: this.fromNumber,
        to: this.ceoNumber,
        twiml: twiml,
      });

      console.log(`✅ Briefing call initiated: ${call.sid}`);
    } catch (error) {
      console.error('❌ Briefing call error:', error);
      throw error;
    }
  }

  /**
   * Split long text into speech-friendly chunks
   */
  private splitForSpeech(text: string): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > 300) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
  }

  /**
   * Escape XML special characters for TwiML
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const voiceService = new VoiceService();
