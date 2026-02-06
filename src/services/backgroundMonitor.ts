/**
 * Background Monitoring Service
 * Periodically checks for urgent items and sends notifications
 */

import { companyService } from './companyService';
import { alertService } from './alertService';

interface UrgentItem {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium';
  timestamp: Date;
  source: string;
}

class BackgroundMonitorService {
  private checkInterval: number = 15 * 60 * 1000; // 15 minutes
  private intervalId: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  /**
   * Start background monitoring - SERVER MODE (24/7)
   */
  start() {
    if (this.isMonitoring) {
      console.log('📡 Background monitoring already running');
      return;
    }

    console.log('🖥️  Starting 24/7 SERVER MODE monitoring (15-minute intervals)');
    console.log('📍 This machine will continuously monitor all configured channels');
    console.log('📢 Alerts will be sent when critical items are detected');
    this.isMonitoring = true;

    // Initial check
    this.checkForUrgentItems();

    // Set up periodic checks
    this.intervalId = setInterval(() => {
      this.checkForUrgentItems();
    }, this.checkInterval);

    // Request notification permission if not already granted
    this.requestNotificationPermission();

    // Register service worker for push notifications
    this.registerServiceWorker();

    // Log startup message
    console.log(`✅ Strategic Advisor is now monitoring 24/7`);
    console.log(`📊 Next check in 15 minutes`);
    console.log(`🌐 Access from any device: http://${window.location.hostname}:5173`);
  }

  /**
   * Stop background monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isMonitoring = false;
    console.log('📡 Background monitoring stopped');
  }

  /**
   * Check for urgent items
   */
  private async checkForUrgentItems() {
    try {
      console.log('🔍 Checking for urgent items...');

      const urgentItems = await this.detectUrgentItems();

      if (urgentItems.length > 0) {
        console.log(`🚨 Found ${urgentItems.length} urgent item(s)`);
        this.notifyUser(urgentItems);
      } else {
        console.log('✅ No urgent items detected');
      }
    } catch (error) {
      console.error('❌ Error checking for urgent items:', error);
    }
  }

  /**
   * Detect urgent items from company data and communications
   */
  private async detectUrgentItems(): Promise<UrgentItem[]> {
    const urgentItems: UrgentItem[] = [];
    const activeCompanies = companyService.getActiveCompanies();

    // Pattern detection for urgent items
    // In production, this would analyze real communication data
    // For now, we'll check localStorage for flagged items

    const storedUrgent = localStorage.getItem('urgent_items');
    if (storedUrgent) {
      try {
        const items = JSON.parse(storedUrgent);
        return items.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      } catch (e) {
        console.error('Error parsing stored urgent items:', e);
      }
    }

    // Check for time-sensitive patterns
    const now = new Date();
    const hour = now.getHours();

    // Morning briefing reminder (8 AM)
    if (hour === 8 && !this.hasCheckedToday('morning-brief')) {
      urgentItems.push({
        id: 'morning-brief',
        title: '🌅 Morning Briefing Available',
        description: `Strategic briefing ready for ${activeCompanies.map(c => c.name).join(', ')}`,
        severity: 'medium',
        timestamp: now,
        source: 'background-monitor',
      });
      this.markChecked('morning-brief');
    }

    // End of day summary (5 PM)
    if (hour === 17 && !this.hasCheckedToday('eod-summary')) {
      urgentItems.push({
        id: 'eod-summary',
        title: '📊 End of Day Summary',
        description: 'Review today\'s critical items and tomorrow\'s priorities',
        severity: 'medium',
        timestamp: now,
        source: 'background-monitor',
      });
      this.markChecked('eod-summary');
    }

    return urgentItems;
  }

  /**
   * Send notification to user
   */
  private notifyUser(urgentItems: UrgentItem[]) {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      const criticalItems = urgentItems.filter(item => item.severity === 'critical');
      const highItems = urgentItems.filter(item => item.severity === 'high');

      let title = '🚨 Strategic Advisor Alert';
      let body = `${urgentItems.length} item(s) need your attention`;

      if (criticalItems.length > 0) {
        title = '🚨 CRITICAL: Immediate Action Required';
        body = criticalItems[0].description;
      } else if (highItems.length > 0) {
        title = '⚠️ Important Update';
        body = highItems[0].description;
      }

      // Send notification
      const notification = new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'strategic-alert',
        requireInteraction: criticalItems.length > 0,
        data: {
          url: '/?urgent=true',
          items: urgentItems,
        },
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Store for later retrieval
      localStorage.setItem('last_notification', JSON.stringify({
        title,
        body,
        items: urgentItems,
        timestamp: new Date(),
      }));
    }
  }

  /**
   * Request notification permission
   */
  private async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return;
    }

    if (Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('✅ Notification permission granted');
          // Send test notification
          new Notification('📡 Background Monitoring Active', {
            body: 'You\'ll receive alerts for critical items every 15 minutes',
            icon: '/icon-192.png',
          });
        } else {
          console.log('❌ Notification permission denied');
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered:', registration.scope);

        // Register periodic background sync if supported
        if ('periodicSync' in registration) {
          try {
            await (registration as any).periodicSync.register('check-urgent-periodic', {
              minInterval: 15 * 60 * 1000, // 15 minutes
            });
            console.log('✅ Periodic background sync registered');
          } catch (error) {
            console.log('Periodic sync not available:', error);
          }
        }
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Check if already checked today
   */
  private hasCheckedToday(key: string): boolean {
    const lastCheck = localStorage.getItem(`last_check_${key}`);
    if (!lastCheck) return false;

    const lastCheckDate = new Date(lastCheck);
    const today = new Date();
    
    return lastCheckDate.toDateString() === today.toDateString();
  }

  /**
   * Mark as checked
   */
  private markChecked(key: string) {
    localStorage.setItem(`last_check_${key}`, new Date().toISOString());
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      interval: this.checkInterval,
      notificationsEnabled: Notification.permission === 'granted',
      serviceWorkerActive: navigator.serviceWorker?.controller !== null,
    };
  }
}

export const backgroundMonitor = new BackgroundMonitorService();
