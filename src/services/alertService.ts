/**
 * Alert Service - Multi-Channel Alert System
 * Sends critical alerts via Email, SMS, Desktop Notifications, and more
 */

import { backgroundMonitor } from './backgroundMonitor';

export interface AlertConfig {
  email?: {
    enabled: boolean;
    to: string;
    smtp?: {
      host: string;
      port: number;
      user: string;
      pass: string;
    };
  };
  sms?: {
    enabled: boolean;
    to: string;
    provider: 'twilio' | 'vonage' | 'aws-sns';
    credentials?: {
      accountSid?: string;
      authToken?: string;
      apiKey?: string;
      apiSecret?: string;
    };
  };
  desktop?: {
    enabled: boolean;
  };
  slack?: {
    enabled: boolean;
    webhookUrl: string;
  };
  teams?: {
    enabled: boolean;
    webhookUrl: string;
  };
  pushover?: {
    enabled: boolean;
    userKey: string;
    apiToken: string;
  };
}

interface Alert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  timestamp: Date;
  source: string;
  actionUrl?: string;
}

class AlertService {
  private config: AlertConfig = {
    desktop: { enabled: true }, // Default to desktop notifications
  };

  /**
   * Load alert configuration from localStorage
   */
  loadConfig() {
    const stored = localStorage.getItem('alert_config');
    if (stored) {
      try {
        this.config = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to load alert config:', e);
      }
    }
  }

  /**
   * Save alert configuration
   */
  saveConfig(config: AlertConfig) {
    this.config = config;
    localStorage.setItem('alert_config', JSON.stringify(config));
  }

  /**
   * Get current configuration
   */
  getConfig(): AlertConfig {
    return this.config;
  }

  /**
   * Send alert through all enabled channels
   */
  async sendAlert(alert: Alert) {
    console.log(`📢 Sending ${alert.severity} alert: ${alert.title}`);

    const promises: Promise<any>[] = [];

    // Desktop notification
    if (this.config.desktop?.enabled) {
      promises.push(this.sendDesktopNotification(alert));
    }

    // Email notification
    if (this.config.email?.enabled) {
      promises.push(this.sendEmailAlert(alert));
    }

    // SMS notification
    if (this.config.sms?.enabled) {
      promises.push(this.sendSMSAlert(alert));
    }

    // Slack notification
    if (this.config.slack?.enabled && this.config.slack.webhookUrl) {
      promises.push(this.sendSlackAlert(alert));
    }

    // Teams notification
    if (this.config.teams?.enabled && this.config.teams.webhookUrl) {
      promises.push(this.sendTeamsAlert(alert));
    }

    // Pushover notification (great for mobile alerts)
    if (this.config.pushover?.enabled) {
      promises.push(this.sendPushoverAlert(alert));
    }

    // Wait for all to complete
    const results = await Promise.allSettled(promises);
    
    // Log results
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Alert channel ${index} failed:`, result.reason);
      }
    });

    // Store alert history
    this.storeAlertHistory(alert);
  }

  /**
   * Send desktop notification
   */
  private async sendDesktopNotification(alert: Alert): Promise<void> {
    if (!('Notification' in window)) {
      throw new Error('Desktop notifications not supported');
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }

    const icon = this.getSeverityIcon(alert.severity);
    const notification = new Notification(alert.title, {
      body: alert.message,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: alert.id,
      requireInteraction: alert.severity === 'critical',
      silent: false,
      timestamp: alert.timestamp.getTime(),
      data: {
        url: alert.actionUrl || '/',
        alertId: alert.id,
      },
    });

    notification.onclick = () => {
      window.focus();
      if (alert.actionUrl) {
        window.location.href = alert.actionUrl;
      }
      notification.close();
    };
  }

  /**
   * Send email alert (requires backend API)
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    if (!this.config.email?.to) {
      throw new Error('Email recipient not configured');
    }

    const subject = `${this.getSeverityEmoji(alert.severity)} ${alert.title}`;
    const body = this.formatEmailBody(alert);

    // Call backend API to send email
    // TODO: Implement backend endpoint
    console.log('📧 Email alert would be sent:', {
      to: this.config.email.to,
      subject,
      body,
    });

    // Placeholder for backend API call:
    // await fetch('/api/alerts/email', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     to: this.config.email.to,
    //     subject,
    //     body,
    //   }),
    // });
  }

  /**
   * Send SMS alert (requires backend API)
   */
  private async sendSMSAlert(alert: Alert): Promise<void> {
    if (!this.config.sms?.to) {
      throw new Error('SMS recipient not configured');
    }

    const message = `${this.getSeverityEmoji(alert.severity)} ${alert.title}\n\n${alert.message.substring(0, 140)}`;

    console.log('📱 SMS alert would be sent:', {
      to: this.config.sms.to,
      message,
    });

    // Placeholder for backend API call:
    // await fetch('/api/alerts/sms', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     to: this.config.sms.to,
    //     message,
    //     provider: this.config.sms.provider,
    //   }),
    // });
  }

  /**
   * Send Slack webhook alert
   */
  private async sendSlackAlert(alert: Alert): Promise<void> {
    if (!this.config.slack?.webhookUrl) {
      throw new Error('Slack webhook not configured');
    }

    const payload = {
      text: alert.title,
      attachments: [
        {
          color: this.getSeverityColor(alert.severity),
          title: alert.title,
          text: alert.message,
          footer: alert.source,
          ts: Math.floor(alert.timestamp.getTime() / 1000),
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Time',
              value: alert.timestamp.toLocaleString(),
              short: true,
            },
          ],
        },
      ],
    };

    await fetch(this.config.slack.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send Microsoft Teams webhook alert
   */
  private async sendTeamsAlert(alert: Alert): Promise<void> {
    if (!this.config.teams?.webhookUrl) {
      throw new Error('Teams webhook not configured');
    }

    const payload = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: alert.title,
      themeColor: this.getSeverityColor(alert.severity).replace('#', ''),
      title: alert.title,
      sections: [
        {
          activityTitle: alert.source,
          activitySubtitle: alert.timestamp.toLocaleString(),
          text: alert.message,
          facts: [
            {
              name: 'Severity:',
              value: alert.severity.toUpperCase(),
            },
          ],
        },
      ],
      potentialAction: alert.actionUrl ? [
        {
          '@type': 'OpenUri',
          name: 'View Details',
          targets: [{ os: 'default', uri: alert.actionUrl }],
        },
      ] : undefined,
    };

    await fetch(this.config.teams.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send Pushover alert (excellent for mobile push notifications)
   */
  private async sendPushoverAlert(alert: Alert): Promise<void> {
    if (!this.config.pushover?.userKey || !this.config.pushover?.apiToken) {
      throw new Error('Pushover credentials not configured');
    }

    const priority = this.getSeverityPushoverPriority(alert.severity);
    
    const formData = new URLSearchParams({
      token: this.config.pushover.apiToken,
      user: this.config.pushover.userKey,
      title: alert.title,
      message: alert.message,
      priority: priority.toString(),
      sound: alert.severity === 'critical' ? 'siren' : 'pushover',
      url: alert.actionUrl || '',
      url_title: 'View Details',
    });

    await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
  }

  /**
   * Format email body with HTML
   */
  private formatEmailBody(alert: Alert): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: ${this.getSeverityColor(alert.severity)}; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f4f4f4; }
    .footer { padding: 10px; text-align: center; font-size: 12px; color: #666; }
    .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${this.getSeverityEmoji(alert.severity)} ${alert.title}</h1>
  </div>
  <div class="content">
    <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
    <p><strong>Time:</strong> ${alert.timestamp.toLocaleString()}</p>
    <p><strong>Source:</strong> ${alert.source}</p>
    <hr>
    <p>${alert.message.replace(/\n/g, '<br>')}</p>
    ${alert.actionUrl ? `<a href="${alert.actionUrl}" class="button">View Details</a>` : ''}
  </div>
  <div class="footer">
    <p>Strategic Advisor Alert System</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Store alert history
   */
  private storeAlertHistory(alert: Alert) {
    const history = this.getAlertHistory();
    history.unshift(alert);
    
    // Keep last 100 alerts
    const trimmed = history.slice(0, 100);
    localStorage.setItem('alert_history', JSON.stringify(trimmed));
  }

  /**
   * Get alert history
   */
  getAlertHistory(): Alert[] {
    const stored = localStorage.getItem('alert_history');
    if (!stored) return [];
    
    try {
      const history = JSON.parse(stored);
      return history.map((a: any) => ({
        ...a,
        timestamp: new Date(a.timestamp),
      }));
    } catch (e) {
      return [];
    }
  }

  /**
   * Helper: Get severity color
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  }

  /**
   * Helper: Get severity emoji
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '📊';
      case 'low': return 'ℹ️';
      default: return '📢';
    }
  }

  /**
   * Helper: Get severity icon
   */
  private getSeverityIcon(severity: string): string {
    return '/icon-192.png'; // Could be customized per severity
  }

  /**
   * Helper: Get Pushover priority
   */
  private getSeverityPushoverPriority(severity: string): number {
    switch (severity) {
      case 'critical': return 2; // Emergency - requires acknowledgment
      case 'high': return 1; // High priority
      case 'medium': return 0; // Normal
      case 'low': return -1; // Low priority
      default: return 0;
    }
  }

  /**
   * Test alert system
   */
  async sendTestAlert() {
    await this.sendAlert({
      id: `test-${Date.now()}`,
      severity: 'medium',
      title: 'Test Alert',
      message: 'This is a test alert from your Strategic Advisor. All systems operational!',
      timestamp: new Date(),
      source: 'Alert System Test',
    });
  }
}

export const alertService = new AlertService();
