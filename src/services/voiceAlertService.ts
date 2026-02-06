/**
 * Voice Alert Service
 * Announces critical alerts using Text-to-Speech
 */

import { deviceService } from './deviceService';

export interface VoiceAlertOptions {
  priority: 'critical' | 'high' | 'medium' | 'low';
  interrupt: boolean;
  repeat?: number;
}

class VoiceAlertService {
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private queue: Array<{ text: string; options: VoiceAlertOptions }> = [];
  private isSpeaking = false;
  private enabled = true;

  constructor() {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.loadSettings();
    } else {
      console.warn('⚠️ Text-to-Speech not supported on this device');
    }
  }

  /**
   * Load voice alert settings
   */
  private loadSettings() {
    const stored = localStorage.getItem('voice_alert_settings');
    if (stored) {
      try {
        const settings = JSON.parse(stored);
        this.enabled = settings.enabled !== false;
      } catch (e) {
        console.error('Failed to load voice alert settings:', e);
      }
    }
  }

  /**
   * Save voice alert settings
   */
  saveSettings(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('voice_alert_settings', JSON.stringify({ enabled }));
  }

  /**
   * Check if voice alerts are enabled
   */
  isEnabled(): boolean {
    return this.enabled && this.synthesis !== null && deviceService.supportsVoice();
  }

  /**
   * Announce alert using voice
   */
  announceAlert(title: string, message: string, options: VoiceAlertOptions) {
    if (!this.isEnabled()) {
      console.log('🔇 Voice alerts disabled or not supported');
      return;
    }

    // Prepare announcement text
    const priorityPrefix = this.getPriorityPrefix(options.priority);
    const announcement = `${priorityPrefix}. ${title}. ${message}`;

    // If critical and should interrupt, stop current speech
    if (options.interrupt && this.isSpeaking) {
      this.stop();
    }

    // Add to queue
    this.queue.push({ text: announcement, options });

    // Process queue
    if (!this.isSpeaking) {
      this.processQueue();
    }
  }

  /**
   * Get priority prefix for announcement
   */
  private getPriorityPrefix(priority: VoiceAlertOptions['priority']): string {
    switch (priority) {
      case 'critical':
        return 'Critical alert';
      case 'high':
        return 'High priority alert';
      case 'medium':
        return 'Alert';
      case 'low':
        return 'Information';
      default:
        return 'Alert';
    }
  }

  /**
   * Process speech queue
   */
  private async processQueue() {
    if (this.queue.length === 0) {
      this.isSpeaking = false;
      return;
    }

    this.isSpeaking = true;
    const { text, options } = this.queue.shift()!;

    await this.speak(text, options);

    // Process next in queue
    this.processQueue();
  }

  /**
   * Speak text using TTS
   */
  private speak(text: string, options: VoiceAlertOptions): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synthesis) {
        resolve();
        return;
      }

      // Vibrate on mobile for critical alerts
      if (options.priority === 'critical' && deviceService.supportsVibration()) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      // Voice settings based on priority
      switch (options.priority) {
        case 'critical':
          utterance.rate = 1.0;
          utterance.pitch = 1.2;
          utterance.volume = 1.0;
          break;
        case 'high':
          utterance.rate = 1.0;
          utterance.pitch = 1.1;
          utterance.volume = 0.9;
          break;
        default:
          utterance.rate = 1.1;
          utterance.pitch = 1.0;
          utterance.volume = 0.8;
          break;
      }

      // Try to use a good voice
      const voices = this.synthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang.startsWith('en') && v.name.includes('Female')
      ) || voices.find(v => v.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        console.log('✅ Voice alert completed');
        this.currentUtterance = null;
        
        // Repeat if specified
        if (options.repeat && options.repeat > 1) {
          options.repeat--;
          setTimeout(() => {
            this.queue.unshift({ text, options });
            resolve();
          }, 1000);
        } else {
          resolve();
        }
      };

      utterance.onerror = (error) => {
        console.error('❌ Speech synthesis error:', error);
        this.currentUtterance = null;
        resolve();
      };

      console.log(`🔊 Speaking: "${text}"`);
      this.synthesis.speak(utterance);
    });
  }

  /**
   * Stop current speech
   */
  stop() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.currentUtterance = null;
      this.isSpeaking = false;
      this.queue = [];
      console.log('🔇 Voice alert stopped');
    }
  }

  /**
   * Quick announcement for critical items (CEO-focused)
   */
  announceCriticalItem(title: string, source: string) {
    if (!this.isEnabled()) return;

    const message = `${title}. From ${source}. Check your device for details.`;
    this.announceAlert(title, message, {
      priority: 'critical',
      interrupt: true,
      repeat: 1,
    });
  }

  /**
   * Announce summary of urgent items
   */
  announceSummary(count: number, criticalCount: number, highCount: number) {
    if (!this.isEnabled()) return;

    let message = '';
    if (criticalCount > 0) {
      message += `${criticalCount} critical ${criticalCount === 1 ? 'item' : 'items'}. `;
    }
    if (highCount > 0) {
      message += `${highCount} high priority ${highCount === 1 ? 'item' : 'items'}. `;
    }

    if (message) {
      this.announceAlert('Alert Summary', message + 'Please review.', {
        priority: criticalCount > 0 ? 'critical' : 'high',
        interrupt: false,
      });
    }
  }

  /**
   * Test voice alerts
   */
  test() {
    console.log('🔊 Testing voice alert...');
    console.log('Speech synthesis available:', this.synthesis !== null);
    console.log('Enabled:', this.enabled);
    console.log('Device supports voice:', deviceService.supportsVoice());
    
    // Force enable for testing if synthesis is available
    if (this.synthesis && !this.enabled) {
      console.log('⚠️ Voice is disabled, but forcing test anyway');
    }
    
    if (!this.synthesis) {
      alert('❌ Text-to-Speech is not supported in your browser. Try Chrome, Safari, or Edge.');
      return;
    }

    // Simple direct test
    const utterance = new SpeechSynthesisUtterance(
      'Testing. This is a test of the voice alert system. If you can hear this message, voice alerts are working correctly.'
    );
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
      console.log('✅ Voice test started');
    };
    
    utterance.onend = () => {
      console.log('✅ Voice test completed');
    };
    
    utterance.onerror = (error) => {
      console.error('❌ Voice test error:', error);
      alert(`Voice test failed: ${error.error}`);
    };
    
    console.log('🔊 Speaking now...');
    this.synthesis.speak(utterance);
  }
}

export const voiceAlertService = new VoiceAlertService();
