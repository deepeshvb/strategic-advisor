/**
 * Device Detection Service
 * Detects device type and capabilities
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  supportsVoice: boolean;
  supportsPush: boolean;
  supportsVibration: boolean;
  platform: string;
  userAgent: string;
}

class DeviceService {
  private deviceInfo: DeviceInfo;

  constructor() {
    this.deviceInfo = this.detectDevice();
  }

  /**
   * Detect device type and capabilities
   */
  private detectDevice(): DeviceInfo {
    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
    const isDesktop = !isMobile;

    return {
      isMobile: isMobile && !isTablet,
      isTablet,
      isDesktop,
      supportsVoice: 'speechSynthesis' in window && 'webkitSpeechRecognition' in window,
      supportsPush: 'Notification' in window && 'serviceWorker' in navigator,
      supportsVibration: 'vibrate' in navigator,
      platform: navigator.platform,
      userAgent: ua,
    };
  }

  /**
   * Get device information
   */
  getDeviceInfo(): DeviceInfo {
    return this.deviceInfo;
  }

  /**
   * Check if current device is mobile
   */
  isMobile(): boolean {
    return this.deviceInfo.isMobile || this.deviceInfo.isTablet;
  }

  /**
   * Check if current device is desktop
   */
  isDesktop(): boolean {
    return this.deviceInfo.isDesktop;
  }

  /**
   * Check if device supports voice
   */
  supportsVoice(): boolean {
    return this.deviceInfo.supportsVoice;
  }

  /**
   * Check if device supports push notifications
   */
  supportsPush(): boolean {
    return this.deviceInfo.supportsPush;
  }

  /**
   * Check if device supports vibration
   */
  supportsVibration(): boolean {
    return this.deviceInfo.supportsVibration;
  }

  /**
   * Get platform name
   */
  getPlatform(): string {
    return this.deviceInfo.platform;
  }

  /**
   * Check if iOS
   */
  isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  /**
   * Check if Android
   */
  isAndroid(): boolean {
    return /Android/.test(navigator.userAgent);
  }

  /**
   * Get device type as string
   */
  getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (this.deviceInfo.isMobile) return 'mobile';
    if (this.deviceInfo.isTablet) return 'tablet';
    return 'desktop';
  }

  /**
   * Save device info to server (for targeted push notifications)
   */
  async registerDevice(userId: string): Promise<void> {
    const deviceData = {
      userId,
      deviceType: this.getDeviceType(),
      platform: this.getPlatform(),
      capabilities: {
        voice: this.supportsVoice(),
        push: this.supportsPush(),
        vibration: this.supportsVibration(),
      },
      timestamp: new Date().toISOString(),
    };

    // Store locally
    localStorage.setItem('device_info', JSON.stringify(deviceData));

    // TODO: Send to backend API
    // await fetch('/api/devices/register', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(deviceData),
    // });

    console.log('📱 Device registered:', deviceData);
  }
}

export const deviceService = new DeviceService();
