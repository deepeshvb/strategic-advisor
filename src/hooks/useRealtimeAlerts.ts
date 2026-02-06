/**
 * React Hook for Real-Time Alerts
 * Listens for incoming alerts and handles them
 */

import { useEffect, useState } from 'react';
import { realtimeService, type RealtimeAlert } from '../services/realtimeService';
import { voiceAlertService } from '../services/voiceAlertService';
import { deviceService } from '../services/deviceService';

export function useRealtimeAlerts() {
  const [latestAlert, setLatestAlert] = useState<RealtimeAlert | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  const [isConnected, setIsConnected] = useState(realtimeService.isConnectedToServer());

  useEffect(() => {
    // Handle incoming alerts
    const handleAlert = (alert: RealtimeAlert) => {
      console.log('📱 Real-time alert received:', alert);
      setLatestAlert(alert);
      setAlertCount(prev => prev + 1);

      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(alert.title, {
          body: alert.message,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: alert.id,
          requireInteraction: alert.type === 'critical',
          vibrate: alert.type === 'critical' ? [200, 100, 200] : [100],
        });
      }

      // Voice announcement on mobile for critical alerts
      if (deviceService.isMobile() && alert.requiresVoice) {
        voiceAlertService.announceCriticalItem(alert.title, alert.source);
      }

      // Vibrate on mobile
      if (deviceService.supportsVibration() && alert.type === 'critical') {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    };

    // Handle connection updates
    const handleUpdate = (data: any) => {
      console.log('📊 Real-time update:', data);
      setIsConnected(true);
    };

    // Register handlers
    realtimeService.on('alert', handleAlert);
    realtimeService.on('update', handleUpdate);

    // Cleanup
    return () => {
      realtimeService.off('alert', handleAlert);
      realtimeService.off('update', handleUpdate);
    };
  }, []);

  const clearLatestAlert = () => {
    setLatestAlert(null);
  };

  return {
    latestAlert,
    alertCount,
    isConnected,
    clearLatestAlert,
  };
}
