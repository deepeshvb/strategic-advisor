import { Mail, MessageSquare, Calendar, Plus, Settings as SettingsIcon, Github, Trello, MessageCircle, Phone, Video } from 'lucide-react';
import { Channel } from '../types';

interface SettingsProps {
  channels: Channel[];
  onToggleChannel: (id: string) => void;
}

export default function Settings({ channels, onToggleChannel }: SettingsProps) {
  const availableIntegrations = [
    { type: 'email', name: 'Gmail', icon: Mail, configured: true, category: 'Email' },
    { type: 'email', name: 'Outlook', icon: Mail, configured: false, category: 'Email' },
    { type: 'email', name: 'Yahoo Mail', icon: Mail, configured: false, category: 'Email' },
    { type: 'teams', name: 'Microsoft Teams', icon: MessageSquare, configured: true, category: 'Chat' },
    { type: 'slack', name: 'Slack', icon: MessageSquare, configured: true, category: 'Chat' },
    { type: 'slack', name: 'Discord', icon: MessageCircle, configured: false, category: 'Chat' },
    { type: 'slack', name: 'Telegram', icon: MessageCircle, configured: false, category: 'Chat' },
    { type: 'slack', name: 'WhatsApp Business', icon: Phone, configured: false, category: 'Chat' },
    { type: 'calendar', name: 'Google Calendar', icon: Calendar, configured: true, category: 'Calendar' },
    { type: 'calendar', name: 'Outlook Calendar', icon: Calendar, configured: false, category: 'Calendar' },
    { type: 'calendar', name: 'Apple Calendar', icon: Calendar, configured: false, category: 'Calendar' },
    { type: 'other', name: 'Zoom', icon: Video, configured: false, category: 'Meetings' },
    { type: 'other', name: 'Google Meet', icon: Video, configured: false, category: 'Meetings' },
    { type: 'other', name: 'Jira', icon: Trello, configured: false, category: 'Project Management' },
    { type: 'other', name: 'Asana', icon: Trello, configured: false, category: 'Project Management' },
    { type: 'other', name: 'Trello', icon: Trello, configured: false, category: 'Project Management' },
    { type: 'other', name: 'GitHub', icon: Github, configured: false, category: 'Development' },
    { type: 'other', name: 'GitLab', icon: Github, configured: false, category: 'Development' },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="w-6 h-6 text-primary-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <p className="text-gray-400">Manage your communication channels and preferences</p>
        </div>
      </div>

      {/* Connected Channels */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Active Channels</h3>
        <div className="space-y-3">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="bg-slate-800 rounded-lg p-4 border border-slate-700 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={channel.connected ? 'text-primary-400' : 'text-gray-500'}>
                  {channel.type === 'email' && <Mail className="w-5 h-5" />}
                  {(channel.type === 'teams' || channel.type === 'slack') && (
                    <MessageSquare className="w-5 h-5" />
                  )}
                  {channel.type === 'calendar' && <Calendar className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-white font-medium">{channel.name}</h4>
                  <p className="text-sm text-gray-400 capitalize">{channel.type}</p>
                </div>
              </div>
              <button
                onClick={() => onToggleChannel(channel.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  channel.connected
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                }`}
              >
                {channel.connected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Available Integrations */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Available Integrations</h3>
        <p className="text-sm text-gray-400 mb-4">
          Connect multiple communication channels to get a comprehensive view of your priorities
        </p>
        
        {['Email', 'Chat', 'Calendar', 'Meetings', 'Project Management', 'Development'].map((category) => {
          const categoryIntegrations = availableIntegrations.filter(
            (i) => i.category === category
          );
          
          if (categoryIntegrations.length === 0) return null;
          
          return (
            <div key={category} className="mb-6">
              <h4 className="text-md font-medium text-gray-300 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary-500 rounded"></span>
                {category}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryIntegrations.map((integration, index) => {
                  const Icon = integration.icon;
                  const isConfigured = channels.some(
                    (c) => c.name === integration.name || c.type === integration.type
                  );
                  
                  return (
                    <div
                      key={index}
                      className="bg-slate-800 rounded-lg p-3 border border-slate-700 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <div>
                            <h5 className="text-white text-sm font-medium">{integration.name}</h5>
                          </div>
                        </div>
                        {isConfigured ? (
                          <span className="text-xs px-2 py-1 bg-green-500 bg-opacity-20 text-green-400 rounded-full">
                            Active
                          </span>
                        ) : (
                          <button className="p-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Settings */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">AI Assistant Settings</h3>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Priority Detection</h4>
              <p className="text-sm text-gray-400">Automatically identify urgent items</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Smart Notifications</h4>
              <p className="text-sm text-gray-400">Get notified about critical updates</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Daily Digest</h4>
              <p className="text-sm text-gray-400">Receive morning summary of priorities</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">API Configuration</h3>
        <div className="space-y-4">
          {/* AI Provider */}
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h4 className="text-white font-medium mb-3">AI Provider</h4>
            <p className="text-sm text-gray-400 mb-3">
              Configure your AI provider for intelligent conversation capabilities.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Provider
                </label>
                <select className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option>OpenAI (GPT-4)</option>
                  <option>Anthropic (Claude)</option>
                  <option>Azure OpenAI</option>
                  <option>Google (Gemini)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* OAuth Integrations */}
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h4 className="text-white font-medium mb-3">OAuth Applications</h4>
            <p className="text-sm text-gray-400 mb-3">
              Configure OAuth credentials for connecting to various platforms.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Microsoft App ID (Teams, Outlook)
                </label>
                <input
                  type="text"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Google Client ID (Gmail, Calendar)
                </label>
                <input
                  type="text"
                  placeholder="xxxxx.apps.googleusercontent.com"
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Slack App Token
                </label>
                <input
                  type="password"
                  placeholder="xoxb-..."
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <button className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 font-medium transition-colors">
            Save All Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
