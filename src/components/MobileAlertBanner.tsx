import { useEffect, useState } from 'react';
import { X, Volume2, VolumeX } from 'lucide-react';
import { useRealtimeAlerts } from '../hooks/useRealtimeAlerts';
import { voiceAlertService } from '../services/voiceAlertService';

export default function MobileAlertBanner() {
  const { latestAlert, clearLatestAlert } = useRealtimeAlerts();
  const [show, setShow] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(voiceAlertService.isEnabled());

  useEffect(() => {
    if (latestAlert) {
      setShow(true);
      // Auto-hide after 10 seconds for non-critical alerts
      if (latestAlert.type !== 'critical') {
        setTimeout(() => {
          setShow(false);
          clearLatestAlert();
        }, 10000);
      }
    }
  }, [latestAlert, clearLatestAlert]);

  const handleDismiss = () => {
    setShow(false);
    voiceAlertService.stop();
    clearLatestAlert();
  };

  const toggleVoice = () => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    voiceAlertService.saveSettings(newState);
    
    if (!newState) {
      voiceAlertService.stop();
    }
  };

  if (!show || !latestAlert) {
    return null;
  }

  const getBgColor = () => {
    switch (latestAlert.type) {
      case 'critical':
        return 'bg-red-900/95 border-red-600';
      case 'high':
        return 'bg-orange-900/95 border-orange-600';
      case 'medium':
        return 'bg-yellow-900/95 border-yellow-600';
      default:
        return 'bg-blue-900/95 border-blue-600';
    }
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${getBgColor()} border-b-2 shadow-lg animate-slide-down`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Alert Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-white uppercase tracking-wide">
                {latestAlert.type} Alert
              </span>
              <span className="text-xs text-gray-300">
                {new Date(latestAlert.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <h3 className="text-white font-bold text-lg mb-1 leading-tight">
              {latestAlert.title}
            </h3>
            <p className="text-gray-200 text-sm leading-snug">
              {latestAlert.message}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Source: {latestAlert.source}
            </p>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={toggleVoice}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
            >
              {voiceEnabled ? (
                <Volume2 className="w-5 h-5 text-white" />
              ) : (
                <VolumeX className="w-5 h-5 text-white" />
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Action Button */}
        {latestAlert.actionUrl && (
          <button
            onClick={() => window.open(latestAlert.actionUrl, '_blank')}
            className="mt-3 w-full bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}
