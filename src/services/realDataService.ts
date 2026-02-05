// Real Data Service - Fetches data from actual integrations
import { integrationManager, IntegrationConfig } from './integrationService';

export interface RealMessage {
  id: string;
  from: string;
  to?: string;
  subject?: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  channelType: 'email' | 'teams' | 'slack' | 'discord' | 'calendar' | 'jira' | 'github';
  metadata?: {
    threadId?: string;
    labels?: string[];
    attachments?: number;
    reactions?: any[];
  };
}

export interface RealDataStats {
  totalMessages: number;
  unreadCount: number;
  todayCount: number;
  urgentCount: number;
  channels: Array<{
    type: string;
    name: string;
    count: number;
    unreadCount: number;
    status: 'connected' | 'error' | 'disconnected';
  }>;
}

class RealDataService {
  private initialized = false;
  private integrationConfigs: Map<string, IntegrationConfig> = new Map();

  /**
   * Initialize all configured integrations
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🚀 Initializing Real Data Service...');

    // Check which integrations are configured via environment variables
    const configs = this.detectConfiguredIntegrations();

    // Connect each configured integration
    for (const config of configs) {
      try {
        const success = await integrationManager.connectIntegration(config);
        if (success) {
          this.integrationConfigs.set(config.type, config);
          console.log(`✅ Connected: ${config.name}`);
        } else {
          console.warn(`⚠️ Failed to connect: ${config.name}`);
        }
      } catch (error) {
        console.error(`❌ Error connecting ${config.name}:`, error);
      }
    }

    this.initialized = true;
    console.log(`✅ Real Data Service initialized with ${this.integrationConfigs.size} integrations`);
  }

  /**
   * Detect which integrations are configured based on environment variables
   */
  private detectConfiguredIntegrations(): IntegrationConfig[] {
    const configs: IntegrationConfig[] = [];

    // Gmail
    if (import.meta.env.VITE_GMAIL_CLIENT_ID) {
      configs.push({
        type: 'email',
        name: 'Gmail',
        enabled: true,
        credentials: {
          clientId: import.meta.env.VITE_GMAIL_CLIENT_ID,
          clientSecret: import.meta.env.VITE_GMAIL_CLIENT_SECRET,
        },
        settings: {
          syncInterval: 5,
          includeRead: false,
        },
      });
    }

    // Microsoft (Teams + Outlook + Calendar)
    if (import.meta.env.VITE_MICROSOFT_CLIENT_ID) {
      configs.push({
        type: 'teams',
        name: 'Microsoft Teams',
        enabled: true,
        credentials: {
          clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
          clientSecret: import.meta.env.VITE_MICROSOFT_CLIENT_SECRET,
        },
        settings: {
          syncInterval: 3,
        },
      });

      configs.push({
        type: 'calendar',
        name: 'Outlook Calendar',
        enabled: true,
        credentials: {
          clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
          clientSecret: import.meta.env.VITE_MICROSOFT_CLIENT_SECRET,
        },
      });
    }

    // Slack
    if (import.meta.env.VITE_SLACK_CLIENT_ID) {
      configs.push({
        type: 'slack',
        name: 'Slack',
        enabled: true,
        credentials: {
          clientId: import.meta.env.VITE_SLACK_CLIENT_ID,
          clientSecret: import.meta.env.VITE_SLACK_CLIENT_SECRET,
        },
        settings: {
          syncInterval: 2,
        },
      });
    }

    // Discord
    if (import.meta.env.VITE_DISCORD_BOT_TOKEN) {
      configs.push({
        type: 'discord',
        name: 'Discord',
        enabled: true,
        credentials: {
          apiKey: import.meta.env.VITE_DISCORD_BOT_TOKEN,
          clientId: import.meta.env.VITE_DISCORD_CLIENT_ID,
        },
        settings: {
          syncInterval: 5,
        },
      });
    }

    // Jira
    if (import.meta.env.VITE_JIRA_API_TOKEN) {
      configs.push({
        type: 'jira',
        name: 'Jira',
        enabled: true,
        credentials: {
          apiKey: import.meta.env.VITE_JIRA_API_TOKEN,
        },
        settings: {
          syncInterval: 10,
        },
      });
    }

    // GitHub
    if (import.meta.env.VITE_GITHUB_PERSONAL_ACCESS_TOKEN) {
      configs.push({
        type: 'github',
        name: 'GitHub',
        enabled: true,
        credentials: {
          accessToken: import.meta.env.VITE_GITHUB_PERSONAL_ACCESS_TOKEN,
        },
        settings: {
          syncInterval: 10,
        },
      });
    }

    return configs;
  }

  /**
   * Fetch all messages from all connected integrations
   */
  async fetchAllMessages(): Promise<RealMessage[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log('📥 Fetching messages from all integrations...');

    try {
      const allData = await integrationManager.syncAll();
      const messages: RealMessage[] = [];

      for (const data of allData) {
        for (const msg of data.messages) {
          messages.push({
            id: msg.id,
            from: msg.from,
            subject: msg.subject,
            content: msg.content,
            timestamp: msg.timestamp,
            isRead: msg.isRead,
            priority: msg.priority as any,
            channelType: data.channelType as any,
          });
        }
      }

      console.log(`✅ Fetched ${messages.length} messages from ${allData.length} channels`);
      return messages;
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      return [];
    }
  }

  /**
   * Get statistics about all integrations and data
   */
  async getStats(): Promise<RealDataStats> {
    if (!this.initialized) {
      await this.initialize();
    }

    const messages = await this.fetchAllMessages();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const stats: RealDataStats = {
      totalMessages: messages.length,
      unreadCount: messages.filter(m => !m.isRead).length,
      todayCount: messages.filter(m => m.timestamp >= todayStart).length,
      urgentCount: messages.filter(m => m.priority === 'urgent').length,
      channels: [],
    };

    // Group by channel
    const channelGroups = new Map<string, RealMessage[]>();
    for (const msg of messages) {
      const existing = channelGroups.get(msg.channelType) || [];
      existing.push(msg);
      channelGroups.set(msg.channelType, existing);
    }

    // Create channel stats
    for (const [type, msgs] of channelGroups) {
      const config = this.integrationConfigs.get(type);
      stats.channels.push({
        type,
        name: config?.name || type,
        count: msgs.length,
        unreadCount: msgs.filter(m => !m.isRead).length,
        status: 'connected',
      });
    }

    return stats;
  }

  /**
   * Get messages for a specific channel type
   */
  async fetchChannelMessages(channelType: string): Promise<RealMessage[]> {
    const allMessages = await this.fetchAllMessages();
    return allMessages.filter(m => m.channelType === channelType);
  }

  /**
   * Check if any integrations are configured
   */
  hasConfiguredIntegrations(): boolean {
    return (
      !!import.meta.env.VITE_GMAIL_CLIENT_ID ||
      !!import.meta.env.VITE_MICROSOFT_CLIENT_ID ||
      !!import.meta.env.VITE_SLACK_CLIENT_ID ||
      !!import.meta.env.VITE_DISCORD_BOT_TOKEN ||
      !!import.meta.env.VITE_JIRA_API_TOKEN ||
      !!import.meta.env.VITE_GITHUB_PERSONAL_ACCESS_TOKEN
    );
  }

  /**
   * Get list of configured integrations
   */
  getConfiguredIntegrations(): string[] {
    const configured: string[] = [];
    
    if (import.meta.env.VITE_GMAIL_CLIENT_ID) configured.push('Gmail');
    if (import.meta.env.VITE_MICROSOFT_CLIENT_ID) configured.push('Microsoft Teams', 'Outlook', 'Calendar');
    if (import.meta.env.VITE_SLACK_CLIENT_ID) configured.push('Slack');
    if (import.meta.env.VITE_DISCORD_BOT_TOKEN) configured.push('Discord');
    if (import.meta.env.VITE_JIRA_API_TOKEN) configured.push('Jira');
    if (import.meta.env.VITE_GITHUB_PERSONAL_ACCESS_TOKEN) configured.push('GitHub');

    return configured;
  }
}

// Export singleton instance
export const realDataService = new RealDataService();
