import { useState, useEffect } from 'react';
import { Settings, CheckCircle2, XCircle, Loader2, Eye, EyeOff, Save, Plus } from 'lucide-react';

interface IntegrationConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  status: 'connected' | 'error' | 'not-configured';
  fields: {
    key: string;
    label: string;
    type: 'text' | 'password' | 'email';
    value: string;
    required: boolean;
  }[];
}

export default function IntegrationSettings() {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([
    {
      id: 'gmail',
      name: 'Gmail',
      type: 'email',
      enabled: false,
      status: 'not-configured',
      fields: [
        { key: 'VITE_GMAIL_CLIENT_ID', label: 'Client ID', type: 'text', value: '', required: true },
        { key: 'VITE_GMAIL_CLIENT_SECRET', label: 'Client Secret', type: 'password', value: '', required: true },
      ],
    },
    {
      id: 'microsoft',
      name: 'Microsoft 365 (Teams + Outlook)',
      type: 'teams',
      enabled: false,
      status: 'not-configured',
      fields: [
        { key: 'VITE_MICROSOFT_CLIENT_ID', label: 'Client ID', type: 'text', value: '', required: true },
        { key: 'VITE_MICROSOFT_CLIENT_SECRET', label: 'Client Secret', type: 'password', value: '', required: true },
        { key: 'VITE_MICROSOFT_TENANT_ID', label: 'Tenant ID', type: 'text', value: '', required: true },
      ],
    },
    {
      id: 'slack',
      name: 'Slack',
      type: 'slack',
      enabled: false,
      status: 'not-configured',
      fields: [
        { key: 'VITE_SLACK_CLIENT_ID', label: 'Client ID', type: 'text', value: '', required: true },
        { key: 'VITE_SLACK_CLIENT_SECRET', label: 'Client Secret', type: 'password', value: '', required: true },
        { key: 'VITE_SLACK_BOT_TOKEN', label: 'Bot Token', type: 'password', value: '', required: true },
      ],
    },
    {
      id: 'discord',
      name: 'Discord',
      type: 'discord',
      enabled: false,
      status: 'not-configured',
      fields: [
        { key: 'VITE_DISCORD_BOT_TOKEN', label: 'Bot Token', type: 'password', value: '', required: true },
        { key: 'VITE_DISCORD_CLIENT_ID', label: 'Client ID', type: 'text', value: '', required: true },
      ],
    },
    {
      id: 'jira',
      name: 'Jira',
      type: 'jira',
      enabled: false,
      status: 'not-configured',
      fields: [
        { key: 'VITE_JIRA_DOMAIN', label: 'Domain (e.g., company.atlassian.net)', type: 'text', value: '', required: true },
        { key: 'VITE_JIRA_EMAIL', label: 'Email', type: 'email', value: '', required: true },
        { key: 'VITE_JIRA_API_TOKEN', label: 'API Token', type: 'password', value: '', required: true },
      ],
    },
    {
      id: 'github',
      name: 'GitHub',
      type: 'github',
      enabled: false,
      status: 'not-configured',
      fields: [
        { key: 'VITE_GITHUB_PERSONAL_ACCESS_TOKEN', label: 'Personal Access Token', type: 'password', value: '', required: true },
      ],
    },
  ]);

  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load existing config from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('integration_config');
    if (saved) {
      try {
        setIntegrations(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved config:', e);
      }
    }
  }, []);

  const handleFieldChange = (integrationId: string, fieldKey: string, value: string) => {
    setIntegrations(prev =>
      prev.map(integration =>
        integration.id === integrationId
          ? {
              ...integration,
              fields: integration.fields.map(field =>
                field.key === fieldKey ? { ...field, value } : field
              ),
            }
          : integration
      )
    );
  };

  const handleToggleIntegration = (integrationId: string) => {
    setIntegrations(prev =>
      prev.map(integration =>
        integration.id === integrationId
          ? { ...integration, enabled: !integration.enabled }
          : integration
      )
    );
  };

  const togglePasswordVisibility = (fieldKey: string) => {
    setShowPasswords(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');

    try {
      // Save to localStorage
      localStorage.setItem('integration_config', JSON.stringify(integrations));

      // Generate .env content
      const envContent = generateEnvFile(integrations);
      
      // Show save message with instructions
      setSaveMessage('Configuration saved! Copy the content below and add to your .env file, then restart the dev server.');
      
      // In a real implementation, you might want to:
      // 1. Send to backend to update .env file
      // 2. Trigger a config reload
      // 3. Test connections
      
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (error) {
      setSaveMessage('Error saving configuration. Please try again.');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const generateEnvFile = (configs: IntegrationConfig[]) => {
    let content = '# Strategic Advisor - Integration Configuration\n';
    content += '# Generated: ' + new Date().toISOString() + '\n\n';
    content += '# Anthropic AI (Required)\n';
    content += 'VITE_ANTHROPIC_API_KEY=your_existing_key_here\n\n';

    configs.forEach(integration => {
      if (integration.enabled) {
        content += `# ${integration.name}\n`;
        integration.fields.forEach(field => {
          content += `${field.key}=${field.value || ''}\n`;
        });
        content += '\n';
      }
    });

    return content;
  };

  const copyEnvToClipboard = () => {
    const envContent = generateEnvFile(integrations);
    navigator.clipboard.writeText(envContent);
    setSaveMessage('Copied to clipboard! Paste into your .env file.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Settings className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Integration Settings</h2>
          <p className="text-gray-400">Configure communication channels for organization-wide scanning</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Configuration
        </button>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
          <p className="text-green-200">{saveMessage}</p>
          {saveMessage.includes('Copy') && (
            <button
              onClick={copyEnvToClipboard}
              className="mt-2 text-sm text-green-400 hover:text-green-300 underline"
            >
              Copy .env content to clipboard
            </button>
          )}
        </div>
      )}

      {/* Integration Cards */}
      <div className="space-y-4">
        {integrations.map(integration => (
          <div
            key={integration.id}
            className={`bg-slate-800 rounded-lg p-6 border-2 transition-colors ${
              integration.enabled ? 'border-primary-600' : 'border-slate-700'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(integration.status)}
                <div>
                  <h3 className="text-lg font-semibold text-white">{integration.name}</h3>
                  <p className="text-sm text-gray-400 capitalize">{integration.type}</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={integration.enabled}
                  onChange={() => handleToggleIntegration(integration.id)}
                  className="w-5 h-5 rounded border-gray-600 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-300">Enable</span>
              </label>
            </div>

            {/* Configuration Fields */}
            {integration.enabled && (
              <div className="space-y-3 mt-4 pt-4 border-t border-slate-700">
                {integration.fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                        value={field.value}
                        onChange={(e) => handleFieldChange(integration.id, field.key, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 pr-10"
                      />
                      {field.type === 'password' && (
                        <button
                          onClick={() => togglePasswordVisibility(field.key)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                        >
                          {showPasswords[field.key] ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      // Open setup guide for this integration
                      window.open(`/REAL-INTEGRATIONS-SETUP.md#${integration.id}`, '_blank');
                    }}
                    className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    How to get {integration.name} credentials
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-3">Setup Instructions</h3>
        <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
          <li>Enable the integrations you want to use</li>
          <li>Fill in the required API keys and credentials (click "How to get credentials" for help)</li>
          <li>Click "Save Configuration"</li>
          <li>Copy the generated .env content</li>
          <li>Paste into your <code className="text-primary-400 bg-slate-900 px-1 rounded">.env</code> file in the project root</li>
          <li>Restart the development server: <code className="text-primary-400 bg-slate-900 px-1 rounded">npm run dev</code></li>
        </ol>
        
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-sm text-yellow-300">
            <strong>Note:</strong> For organization-wide scanning (all emails/Teams chats), you'll need admin-level permissions. 
            See <code className="text-primary-400 bg-slate-900 px-1 rounded">ORGANIZATION-WIDE-SCANNING.md</code> for details.
          </p>
        </div>
      </div>
    </div>
  );
}
