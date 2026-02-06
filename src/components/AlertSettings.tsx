import { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Smartphone, Send, Volume2 } from 'lucide-react';
import { alertService, type AlertConfig } from '../services/alertService';
import { voiceAlertService } from '../services/voiceAlertService';
import { deviceService } from '../services/deviceService';

export default function AlertSettings() {
  const [config, setConfig] = useState<AlertConfig>(alertService.getConfig());
  const [testStatus, setTestStatus] = useState<string>('');
  const [voiceEnabled, setVoiceEnabled] = useState(voiceAlertService.isEnabled());
  const isMobile = deviceService.isMobile();

  useEffect(() => {
    alertService.loadConfig();
    setConfig(alertService.getConfig());
  }, []);

  const handleSave = () => {
    alertService.saveConfig(config);
    alert('Alert configuration saved!');
  };

  const handleTest = async () => {
    setTestStatus('Sending test alert...');
    try {
      await alertService.sendTestAlert();
      setTestStatus('✅ Test alert sent successfully!');
    } catch (error) {
      setTestStatus(`❌ Error: ${error}`);
    }
    setTimeout(() => setTestStatus(''), 5000);
  };

  const handleToggleVoice = () => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    voiceAlertService.saveSettings(newState);
  };

  const handleTestVoice = () => {
    voiceAlertService.test();
  };

  const history = alertService.getAlertHistory();

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Alert Configuration</h2>
        <p className="text-sm md:text-base text-gray-400">
          Configure how you want to receive critical alerts when monitoring detects important items.
        </p>
        {isMobile && (
          <div className="mt-3 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
            <p className="text-xs md:text-sm text-blue-300">
              📱 <strong>Mobile Device Detected:</strong> Your session will never timeout, and you'll receive real-time voice alerts for critical items.
            </p>
          </div>
        )}
      </div>

      {/* Voice Alerts - Available on All Devices */}
      <div className="bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Volume2 className="w-5 h-5 md:w-6 md:h-6 text-primary-400 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="text-base md:text-lg font-semibold text-white">Voice Alerts</h3>
              <p className="text-xs md:text-sm text-gray-400">Announce critical alerts using text-to-speech</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={voiceEnabled}
              onChange={handleToggleVoice}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="space-y-3">
          {/* Device Info */}
          <div className="p-3 bg-slate-700/50 rounded text-xs space-y-1">
            <p className="text-gray-300">
              <strong>Device:</strong> {isMobile ? '📱 Mobile' : '💻 Desktop'} 
              {' '}({deviceService.getDeviceType()})
            </p>
            <p className="text-gray-300">
              <strong>Browser Support:</strong> {
                'speechSynthesis' in window ? '✅ Text-to-Speech Available' : '❌ Not Supported'
              }
            </p>
            <p className="text-gray-300">
              <strong>Voice Enabled:</strong> {voiceEnabled ? '✅ Yes' : '❌ No'}
            </p>
          </div>

          <div className="p-3 bg-slate-700/50 rounded">
            <p className="text-sm text-gray-300">
              <strong>How it works:</strong> When a critical alert arrives, your device will announce it using text-to-speech. Perfect for hands-free awareness when driving, in meetings, or when your device is across the room.
            </p>
          </div>

          <button
            onClick={handleTestVoice}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-3 md:py-2 rounded-lg font-medium transition-colors text-sm md:text-base touch-manipulation"
          >
            <Volume2 className="w-4 h-4" />
            Test Voice Alert
          </button>

          {!('speechSynthesis' in window) && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded">
              <p className="text-sm text-red-300">
                ⚠️ Your browser doesn't support text-to-speech. Try Chrome, Safari, or Edge.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Notifications */}
      <div className="bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 md:w-6 md:h-6 text-blue-400 flex-shrink-0" />
          <h3 className="text-base md:text-lg font-semibold text-white">Desktop Notifications</h3>
        </div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={config.desktop?.enabled ?? true}
            onChange={(e) => setConfig({
              ...config,
              desktop: { enabled: e.target.checked },
            })}
            className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
          />
          <span className="text-gray-300">Enable desktop notifications (recommended)</span>
        </label>
        <p className="text-xs text-gray-500 mt-2">
          Shows OS-level notifications on this machine
        </p>
      </div>

      {/* Email Alerts */}
      <div className="bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="w-5 h-5 md:w-6 md:h-6 text-red-400 flex-shrink-0" />
          <h3 className="text-base md:text-lg font-semibold text-white">Email Alerts</h3>
        </div>
        <label className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={config.email?.enabled ?? false}
            onChange={(e) => setConfig({
              ...config,
              email: { ...config.email, enabled: e.target.checked, to: config.email?.to || '' },
            })}
            className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
          />
          <span className="text-gray-300">Enable email alerts</span>
        </label>
        {config.email?.enabled && (
          <div className="space-y-3 ml-0 sm:ml-7">
            <input
              type="email"
              placeholder="your@email.com"
              value={config.email.to}
              onChange={(e) => setConfig({
                ...config,
                email: { ...config.email!, to: e.target.value },
              })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-3 md:py-2 text-sm md:text-base text-white"
            />
            <p className="text-xs text-yellow-400">
              ⚠️ Requires backend API configuration
            </p>
          </div>
        )}
      </div>

      {/* SMS Alerts */}
      <div className="bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Smartphone className="w-5 h-5 md:w-6 md:h-6 text-green-400 flex-shrink-0" />
          <h3 className="text-base md:text-lg font-semibold text-white">SMS Alerts</h3>
        </div>
        <label className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={config.sms?.enabled ?? false}
            onChange={(e) => setConfig({
              ...config,
              sms: { ...config.sms, enabled: e.target.checked, to: config.sms?.to || '', provider: 'twilio' },
            })}
            className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
          />
          <span className="text-gray-300">Enable SMS alerts</span>
        </label>
        {config.sms?.enabled && (
          <div className="space-y-3 ml-7">
            <input
              type="tel"
              placeholder="+1234567890"
              value={config.sms.to}
              onChange={(e) => setConfig({
                ...config,
                sms: { ...config.sms!, to: e.target.value },
              })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
            <p className="text-xs text-yellow-400">
              ⚠️ Requires backend API with Twilio/Vonage/AWS SNS
            </p>
          </div>
        )}
      </div>

      {/* Slack Webhook */}
      <div className="bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-purple-400 flex-shrink-0" />
          <h3 className="text-base md:text-lg font-semibold text-white">Slack Notifications</h3>
        </div>
        <label className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={config.slack?.enabled ?? false}
            onChange={(e) => setConfig({
              ...config,
              slack: { ...config.slack, enabled: e.target.checked, webhookUrl: config.slack?.webhookUrl || '' },
            })}
            className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
          />
          <span className="text-gray-300">Enable Slack notifications</span>
        </label>
        {config.slack?.enabled && (
          <div className="space-y-2 ml-7">
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={config.slack.webhookUrl}
              onChange={(e) => setConfig({
                ...config,
                slack: { ...config.slack!, webhookUrl: e.target.value },
              })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
            />
            <p className="text-xs text-gray-500">
              Create webhook at: Slack → Apps → Incoming Webhooks
            </p>
          </div>
        )}
      </div>

      {/* Pushover */}
      <div className="bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Smartphone className="w-5 h-5 md:w-6 md:h-6 text-orange-400 flex-shrink-0" />
          <h3 className="text-base md:text-lg font-semibold text-white break-words">Pushover (Recommended for Mobile)</h3>
        </div>
        <label className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={config.pushover?.enabled ?? false}
            onChange={(e) => setConfig({
              ...config,
              pushover: { ...config.pushover, enabled: e.target.checked, userKey: config.pushover?.userKey || '', apiToken: config.pushover?.apiToken || '' },
            })}
            className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
          />
          <span className="text-gray-300">Enable Pushover push notifications</span>
        </label>
        {config.pushover?.enabled && (
          <div className="space-y-3 ml-7">
            <input
              type="text"
              placeholder="User Key"
              value={config.pushover.userKey}
              onChange={(e) => setConfig({
                ...config,
                pushover: { ...config.pushover!, userKey: e.target.value },
              })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
            />
            <input
              type="text"
              placeholder="API Token"
              value={config.pushover.apiToken}
              onChange={(e) => setConfig({
                ...config,
                pushover: { ...config.pushover!, apiToken: e.target.value },
              })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
            />
            <p className="text-xs text-gray-500">
              Sign up at: <a href="https://pushover.net" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">pushover.net</a>
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 md:py-2 rounded-lg font-medium transition-colors text-sm md:text-base touch-manipulation"
        >
          <Send className="w-4 h-4" />
          Save Configuration
        </button>
        <button
          onClick={handleTest}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 md:py-2 rounded-lg font-medium transition-colors text-sm md:text-base touch-manipulation"
        >
          <Bell className="w-4 h-4" />
          Send Test Alert
        </button>
      </div>

      {testStatus && (
        <div className={`p-4 rounded-lg ${testStatus.includes('✅') ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
          <p className="text-white">{testStatus}</p>
        </div>
      )}

      {/* Alert History */}
      <div className="bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-700">
        <h3 className="text-base md:text-lg font-semibold text-white mb-4">Alert History (Last 10)</h3>
        <div className="space-y-2">
          {history.slice(0, 10).map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 p-3 bg-slate-700/50 rounded border border-slate-600">
              <span className="text-xl md:text-2xl flex-shrink-0">{alert.severity === 'critical' ? '🚨' : alert.severity === 'high' ? '⚠️' : '📊'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm md:text-base text-white font-medium break-words">{alert.title}</p>
                <p className="text-xs md:text-sm text-gray-400">{alert.timestamp.toLocaleString()}</p>
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <p className="text-gray-500 text-center py-4">No alerts sent yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
