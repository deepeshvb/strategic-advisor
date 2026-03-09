import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.backend' });

interface EmailOptions {
  subject: string;
  body: string;
  isHTML?: boolean;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private ceoEmail: string;

  constructor() {
    this.ceoEmail = process.env.CEO_EMAIL || '';

    // Use Gmail SMTP
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  /**
   * Send email to CEO
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: `Strategic AI Advisor <${process.env.GMAIL_USER}>`,
        to: this.ceoEmail,
        subject: options.subject,
        [options.isHTML ? 'html' : 'text']: options.body,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent: ${info.messageId}`);
    } catch (error) {
      console.error('❌ Email error:', error);
      throw error;
    }
  }

  /**
   * Send morning briefing email
   */
  async sendMorningBriefing(summary: string, criticalItems: any[]): Promise<void> {
    const subject = `☀️ Morning Briefing - ${new Date().toLocaleDateString()}`;
    
    const body = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #10b981;">☀️ Good Morning, Deepesh!</h2>
  
  <p>Here's your strategic briefing for today:</p>
  
  <h3 style="color: #059669;">📊 Executive Summary</h3>
  <p>${summary}</p>
  
  ${criticalItems.length > 0 ? `
  <h3 style="color: #dc2626;">🚨 Critical Items Requiring Attention</h3>
  <ul>
    ${criticalItems.map(item => `
      <li style="margin-bottom: 10px;">
        <strong>${item.title}</strong><br/>
        ${item.description}<br/>
        <span style="color: #666; font-size: 0.9em;">Source: ${item.source}</span>
      </li>
    `).join('')}
  </ul>
  ` : '<p style="color: #059669;">✅ No critical issues detected.</p>'}
  
  <hr style="border: 1px solid #e5e7eb; margin: 20px 0;"/>
  
  <p style="font-size: 0.9em; color: #666;">
    Reply to this email or text me via WhatsApp for more details.<br/>
    Your Strategic AI Advisor is monitoring 24/7.
  </p>
</body>
</html>
    `;

    await this.sendEmail({
      subject,
      body,
      isHTML: true,
    });
  }

  /**
   * Send evening summary email
   */
  async sendEveningSummary(summary: string, achievements: string[], nextSteps: string[]): Promise<void> {
    const subject = `🌙 Evening Summary - ${new Date().toLocaleDateString()}`;
    
    const body = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #10b981;">🌙 End of Day Summary</h2>
  
  <h3 style="color: #059669;">📈 Today's Highlights</h3>
  <p>${summary}</p>
  
  ${achievements.length > 0 ? `
  <h3 style="color: #10b981;">✅ Key Achievements</h3>
  <ul>
    ${achievements.map(item => `<li>${item}</li>`).join('')}
  </ul>
  ` : ''}
  
  ${nextSteps.length > 0 ? `
  <h3 style="color: #f59e0b;">🎯 Tomorrow's Priorities</h3>
  <ul>
    ${nextSteps.map(item => `<li>${item}</li>`).join('')}
  </ul>
  ` : ''}
  
  <hr style="border: 1px solid #e5e7eb; margin: 20px 0;"/>
  
  <p style="font-size: 0.9em; color: #666;">
    Have a great evening, Deepesh!<br/>
    Your Strategic AI Advisor
  </p>
</body>
</html>
    `;

    await this.sendEmail({
      subject,
      body,
      isHTML: true,
    });
  }
}

export const emailService = new EmailService();
