/**
 * Real-Time Communication Service
 * WebSocket-based real-time updates from server to clients
 */

export interface RealtimeAlert {
  id: string;
  type: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  actionUrl?: string;
  requiresVoice?: boolean;
}

type MessageHandler = (data: any) => void;

class RealtimeService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 3000; // 3 seconds
  private handlers: Map<string, MessageHandler[]> = new Map();
  private isConnected = false;
  private heartbeatInterval: number | null = null;

  constructor() {
    this.connect();
  }

  /**
   * Connect to WebSocket server
   */
  private connect() {
    try {
      // Determine WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = 5174; // WebSocket server port (different from HTTP)
      
      // For now, use fallback polling instead of WebSocket
      // WebSocket requires backend server
      console.log('📡 Real-time service: Using polling fallback (WebSocket requires backend)');
      this.startPolling();
      
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Fallback: Poll for updates instead of WebSocket
   */
  private startPolling() {
    this.isConnected = true;
    
    // Check for updates every 10 seconds
    setInterval(() => {
      this.checkForUpdates();
    }, 10000);

    console.log('✅ Real-time service started (polling mode)');
  }

  /**
   * Check for updates (polling fallback)
   */
  private async checkForUpdates() {
    try {
      // Check localStorage for pending alerts from background monitor
      const pendingAlerts = localStorage.getItem('pending_realtime_alerts');
      if (pendingAlerts) {
        const alerts = JSON.parse(pendingAlerts);
        alerts.forEach((alert: RealtimeAlert) => {
          this.handleIncomingAlert(alert);
        });
        // Clear processed alerts
        localStorage.removeItem('pending_realtime_alerts');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }

  /**
   * Handle WebSocket connection open
   */
  private onOpen() {
    console.log('✅ WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.startHeartbeat();

    // Authenticate
    const user = localStorage.getItem('current_user');
    if (user) {
      const userData = JSON.parse(user);
      this.send('auth', { userId: userData.id });
    }
  }

  /**
   * Handle WebSocket message
   */
  private onMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      console.log('📨 Received:', data);

      // Route message to handlers
      if (data.type === 'alert') {
        this.handleIncomingAlert(data.payload);
      } else if (data.type === 'update') {
        this.emit('update', data.payload);
      } else if (data.type === 'pong') {
        // Heartbeat response
      } else {
        this.emit(data.type, data.payload);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle incoming alert
   */
  private handleIncomingAlert(alert: RealtimeAlert) {
    console.log('🚨 Incoming alert:', alert);
    this.emit('alert', alert);
  }

  /**
   * Handle WebSocket error
   */
  private onError(error: Event) {
    console.error('❌ WebSocket error:', error);
  }

  /**
   * Handle WebSocket close
   */
  private onClose() {
    console.log('🔌 WebSocket disconnected');
    this.isConnected = false;
    this.stopHeartbeat();
    this.scheduleReconnect();
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat() {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.send('ping', {});
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send message to server
   */
  private send(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  /**
   * Register event handler
   */
  on(event: string, handler: MessageHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  /**
   * Unregister event handler
   */
  off(event: string, handler: MessageHandler) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to handlers
   */
  private emit(event: string, data: any) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * Check if connected
   */
  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopHeartbeat();
  }

  /**
   * Queue alert for real-time delivery
   */
  queueAlert(alert: RealtimeAlert) {
    // Store in localStorage for polling clients to pick up
    const existing = localStorage.getItem('pending_realtime_alerts');
    const alerts = existing ? JSON.parse(existing) : [];
    alerts.push({
      ...alert,
      timestamp: new Date(alert.timestamp).toISOString(),
    });
    localStorage.setItem('pending_realtime_alerts', JSON.stringify(alerts));
    
    // Also emit locally
    this.handleIncomingAlert(alert);
  }
}

export const realtimeService = new RealtimeService();
