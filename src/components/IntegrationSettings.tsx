import { useState, useEffect } from 'react';
import { Settings, CheckCircle2, XCircle, Loader2, Eye, EyeOff, Save, Plus, AlertCircle } from 'lucide-react';

interface IntegrationConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  status: 'connected' | 'error' | 'not-configured';
  requiresBackend: boolean;
  backendReason?: string;
  fields: {
    key: string;
    label: string;
    type: 'text' | 'password' | 'email' | 'file';
    value: string;
    required: boolean;
    frontendSafe: boolean;
    backendOnly?: boolean;
    description?: string;
  }[];
}

export default function IntegrationSettings() {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([
    {
      id: 'gmail',
      name: 'Gmail (Personal Access)',
      type: 'email',
      enabled: false,
      status: 'not-configured',
      requiresBackend: false,
      fields: [
        { 
          key: 'VITE_GMAIL_CLIENT_ID', 
          label: 'Client ID', 
          type: 'text', 
          value: '', 
          required: true,
          frontendSafe: true,
          description: 'OAuth Client ID from Google Cloud Console'
        },
        { 
          key: 'VITE_GMAIL_CLIENT_SECRET', 
          label: 'Client Secret', 
          type: 'password', 
          value: '', 
          required: true,
          frontendSafe: false,
          backendOnly: true,
          description: '⚠️ BACKEND ONLY - Never expose in frontend code'
        },
        { 
          key: 'VITE_GMAIL_REDIRECT_URI', 
          label: 'Redirect URI', 
          type: 'text', 
          value: 'http://localhost:5173/auth/gmail/callback', 
          required: true,
          frontendSafe: true,
          description: 'Must match OAuth app configuration'
        },
      ],
    },
    {
      id: 'gmail-org',
      name: 'Gmail (Organization-Wide)',
      type: 'email',
      enabled: false,
      status: 'not-configured',
      requiresBackend: true,
      backendReason: 'Service Account credentials must be stored securely on backend server',
      fields: [
        { 
          key: 'GOOGLE_SERVICE_ACCOUNT_KEY', 
          label: 'Service Account JSON Key', 
          type: 'file', 
          value: '', 
          required: true,
          frontendSafe: false,
          backendOnly: true,
          description: '🔴 BACKEND ONLY - Upload to secure server storage, never frontend'
        },
        { 
          key: 'GOOGLE_DOMAIN', 
          label: 'Google Workspace Domain', 
          type: 'text', 
          value: '', 
          required: true,
          frontendSafe: true,
          description: 'Your company domain (e.g., company.com)'
        },
        { 
          key: 'SCAN_ALL_MAILBOXES', 
          label: 'Enable Organization-Wide Scanning', 
          type: 'text', 
          value: 'true', 
          required: true,
          frontendSafe: true,
          description: 'Requires Domain-Wide Delegation in Google Workspace'
        },
      ],
    },
    {
      id: 'microsoft-personal',
      name: 'Microsoft 365 (Personal Access)',
      type: 'teams',
      enabled: false,
      status: 'not-configured',
      requiresBackend: false,
      fields: [
        { 
          key: 'VITE_MICROSOFT_CLIENT_ID', 
          label: 'Application (Client) ID', 
          type: 'text', 
          value: '', 
          required: true,
          frontendSafe: true,
          description: 'From Azure AD App Registration'
        },
        { 
          key: 'VITE_MICROSOFT_CLIENT_SECRET', 
          label: 'Client Secret', 
          type: 'password', 
          value: '', 
          required: true,
          frontendSafe: false,
          backendOnly: true,
          description: '⚠️ BACKEND ONLY - Must be stored securely on server'
        },
        { 
          key: 'VITE_MICROSOFT_TENANT_ID', 
          label: 'Directory (Tenant) ID', 
          type: 'text', 
          value: '', 
          required: true,
          frontendSafe: true,
          description: 'Your Azure AD tenant identifier'
        },
        { 
          key: 'VITE_MICROSOFT_REDIRECT_URI', 
          label: 'Redirect URI', 
          type: 'text', 
          value: 'http://localhost:5173/auth/microsoft/callback', 
          required: true,
          frontendSafe: true,
          description: 'OAuth callback URL'
        },
      ],
    },
    {
      id: 'microsoft-org',
      name: 'Microsoft 365 (Organization-Wide)',
      type: 'teams',
      enabled: false,
      status: 'not-configured',
      requiresBackend: true,
      backendReason: 'Application permissions require backend server with Client Credentials flow',
      fields: [
        { 
          key: 'MICROSOFT_CLIENT_ID', 
          label: 'Application (Client) ID', 
          type: 'text', 
          value: '', 
          required: true,
          frontendSafe: false,
          backendOnly: true,
          description: '🔴 BACKEND ONLY - Used for app-only authentication'
        },
        { 
          key: 'MICROSOFT_CLIENT_SECRET', 
          label: 'Client Secret', 
          type: 'password', 
          value: '', 
          required: true,
          frontendSafe: false,
          backendOnly: true,
          description: '🔴 BACKEND ONLY - Critical secret for server authentication'
        },
        { 
          key: 'MICROSOFT_TENANT_ID', 
          label: 'Directory (Tenant) ID', 
          type: 'text', 
          value: '', 
          required: true,
          frontendSafe: false,
          backendOnly: true,
          description: '🔴 BACKEND ONLY - Part of server authentication'
        },
        { 
          key: 'MICROSOFT_GRAPH_SCOPE', 
          label: 'Graph API Scope', 
          type: 'text', 
          value: '.default', 
          required: true,
          frontendSafe: false,
          backendOnly: true,
          description: 'For application permissions (not delegated)'
        },
        { 
          key: 'SCAN_ALL_MAILBOXES', 
          label: 'Scan All Mailboxes', 
          type: 'text', 
          value: 'true', 
          required: false,
          frontendSafe: true,
          description: 'Enable scanning all user mailboxes'
        },
        { 
          key: 'SCAN_ALL_TEAMS', 
          label: 'Scan All Teams Channels', 
          type: 'text', 
          value: 'true', 
          required: false,
          frontendSafe: true,
          description: 'Enable scanning all Teams conversations'
        },
      ],
    },
    {
      id: 'slack',
      name: 'Slack',
      type: 'slack',
      enabled: false,
      status: 'not-configured',
      requiresBackend: false,
      fields: [
        { 
          key: 'VITE_SLACK_CLIENT_ID', 
          label: 'Client ID', 
          type: 'text', 
          value: '', 
          required: true,
          frontendSafe: true,
          description: 'From Slack App configuration'
        },
        { 
          key: 'VITE_SLACK_CLIENT_SECRET', 
          label: 'Client Secret', 
          type: 'password', 
          value: '', 
          required: true,
          frontendSafe: false,
          backendOnly: true,
          description: '⚠️ BACKEND ONLY - Slack app secret'
        },
        { 
          key: 'VITE_SLACK_BOT_TOKEN', 
          label: 'Bot Token', 
          type: 'password', 
          value: '', 
          required: true,
          frontendSafe: false,
          backendOnly: true,
          description: '⚠️ BACKEND ONLY - Bot user OAuth token'
        },
      ],
    },
    {
      id: 'discord',
      name: 'Discord Server',
      type: 'discord',
      enabled: false,
      status: 'not-configured',
      requiresBackend: true,
      backendReason: 'Bot tokens grant full server access and must be protected on backend',
      fields: [
        { 
          key: 'VITE_DISCORD_CLIENT_ID', 
          label: 'Application ID', 
          type: 'text', 
          value: '', 
          required: true,
          frontendSafe: true,
          description: 'Public application identifier'
        },
        { 
          key: 'DISCORD_CLIENT_SECRET', 
          label: 'Client Secret', 
          type: 'password', 
          value: '', 
          required: true,
          frontendSafe: false,
          backendOnly: true,
          description: '🔴 BACKEND ONLY - Application secret'
        },
        { 
          key: 'DISCORD_BOT_TOKEN', 
          label: 'Bot Token', 
          type: 'password', 
          value: '', 
          required: true,
          frontendSafe: false,
          backendOnly: true,
          description: '🔴 BACKEND ONLY - Full bot access token'
        },
      ],
    },
    {
      id: 'jira',
      name: 'Jira Cloud',
      type: 'jira',
      enabled: false,
      status: 'not-configured',
      requiresBackend: true,
      backendReason: 'API tokens provide full account access and must be secured on backend',
      fields: [
        { 
          key: 'JIRA_DOMAIN', 
          label: 'Jira Domain', 
          type: 'text', 
          value: '', 
          required: true,
          frontendSafe: true,
          description: 'Your Jira site (e.g., company.atlassian.net)'
        },
        { 
          key: 'JIRA_EMAIL', 
          label: 'Account Email', 
          type: 'email', 
          value: '', 
          required: true,
          frontendSafe: false,
          backendOnly: true,
          description: '🔴 BACKEND ONLY - Used with API token for authentication'
        },
        { 
          key: 'JIRA_API_TOKEN', 
          label: 'API Token', 
          type: 'password', 
          value: '', 
          required: true,
          frontendSafe: false,
          backendOnly: true,
          description: '🔴 BACKEND ONLY - Full API access token'
        },
      ],
    },
    {
      id: 'github',
      name: 'GitHub Repositories',
      type: 'github',
      enabled: false,
      status: 'not-configured',
      requiresBackend: true,
      backendReason: 'Personal Access Tokens grant repository access and must be stored securely',
      fields: [
        { 
          key: 'GITHUB_PERSONAL_ACCESS_TOKEN', 
          label: 'Personal Access Token', 
          type: 'password', 
          value: '', 
          required: true,
          frontendSafe: false,
          backendOnly: true,
          description: '🔴 BACKEND ONLY - Grants full repository access (ghp_...)'
        },
        { 
          key: 'VITE_GITHUB_CLIENT_ID', 
          label: 'OAuth Client ID (Optional)', 
          type: 'text', 
          value: '', 
          required: false,
          frontendSafe: true,
          description: 'For OAuth app (team use)'
        },
        { 
          key: 'GITHUB_CLIENT_SECRET', 
          label: 'OAuth Client Secret (Optional)', 
          type: 'password', 
          value: '', 
          required: false,
          frontendSafe: false,
          backendOnly: true,
          description: '🔴 BACKEND ONLY - OAuth app secret'
        },
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

  const handleFileChange = (integrationId: string, fieldKey: string, file: File | null) => {
    if (!file) return;
    
    setIntegrations(prev =>
      prev.map(integration =>
        integration.id === integrationId
          ? {
              ...integration,
              fields: integration.fields.map(field =>
                field.key === fieldKey ? { ...field, value: file.name } : field
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
      setSaveMessage('✅ Configuration saved! Copy the content below and add to your .env file, then restart the dev server.');
      
      // In a real implementation, you might want to:
      // 1. Send to backend to update .env file
      // 2. Trigger a config reload
      // 3. Test connections
      
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (error) {
      setSaveMessage('❌ Error saving configuration. Please try again.');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const generateEnvFile = (configs: IntegrationConfig[]) => {
    let content = '# Strategic Advisor - Integration Configuration\n';
    content += '# Generated: ' + new Date().toISOString() + '\n\n';
    content += '# Anthropic AI (Required for Cloud API mode)\n';
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
    setSaveMessage('📋 Copied to clipboard! Paste into your .env file.');
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
    <div className="w-full max-w-full space-y-6 p-4 md:p-6 bg-slate-900">
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
        <div className={`border rounded-lg p-4 ${
          saveMessage.includes('Error') || saveMessage.includes('❌')
            ? 'bg-red-900/20 border-red-700/50'
            : 'bg-green-900/20 border-green-700/50'
        }`}>
          <p className={saveMessage.includes('Error') || saveMessage.includes('❌') ? 'text-red-200' : 'text-green-200'}>
            {saveMessage}
          </p>
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
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{integration.name}</h3>
                    {integration.requiresBackend && (
                      <span className="px-2 py-1 bg-red-900/30 border border-red-700/50 text-red-400 text-xs rounded-md font-medium">
                        Backend Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 capitalize">{integration.type}</p>
                  {integration.requiresBackend && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠️ {integration.backendReason}
                    </p>
                  )}
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
                  <div key={field.key} className={field.backendOnly ? 'bg-red-900/10 border-2 border-red-900/30 rounded-lg p-3' : ''}>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                      {field.backendOnly && (
                        <span className="ml-2 px-2 py-0.5 bg-red-900/50 text-red-300 text-xs rounded-md">
                          Backend Only
                        </span>
                      )}
                      {field.frontendSafe && !field.backendOnly && (
                        <span className="ml-2 px-2 py-0.5 bg-green-900/50 text-green-300 text-xs rounded-md">
                          Frontend Safe
                        </span>
                      )}
                    </label>
                    {field.description && (
                      <p className={`text-xs mb-2 ${field.backendOnly ? 'text-red-400 font-medium' : 'text-gray-500'}`}>
                        {field.description}
                      </p>
                    )}
                    <div className="relative">
                      <input
                        type={field.type === 'password' && !showPasswords[field.key] ? 'password' : field.type === 'file' ? 'file' : 'text'}
                        value={field.type === 'file' ? undefined : field.value}
                        onChange={(e) => {
                          if (field.type === 'file') {
                            handleFileChange(integration.id, field.key, e.target.files?.[0] || null);
                          } else {
                            handleFieldChange(integration.id, field.key, e.target.value);
                          }
                        }}
                        placeholder={field.backendOnly ? 'Configure on backend server' : `Enter ${field.label.toLowerCase()}`}
                        disabled={field.backendOnly}
                        accept={field.type === 'file' ? '.json' : undefined}
                        className={`w-full px-3 py-2 bg-slate-900 border rounded-lg placeholder-gray-500 focus:outline-none pr-10 ${
                          field.backendOnly 
                            ? 'border-red-900 text-red-400 cursor-not-allowed opacity-60' 
                            : 'border-slate-600 text-white focus:border-primary-500'
                        }`}
                      />
                      {field.type === 'file' && field.value && (
                        <div className="mt-1 text-xs text-gray-400">
                          Selected: {field.value}
                        </div>
                      )}
                      {field.type === 'password' && !field.backendOnly && (
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
                      alert('See IMPLEMENTATION-GUIDE.md for detailed setup instructions');
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

      {/* Security Warning */}
      <div className="bg-red-900/20 border-2 border-red-700/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Critical Security Information
        </h3>
        <div className="space-y-3 text-sm text-gray-200">
          <div>
            <p className="font-semibold text-red-300 mb-1">🔴 Backend-Only Fields (Red)</p>
            <p>These credentials provide FULL ACCESS to your systems and must NEVER be exposed in frontend code:</p>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-gray-300">
              <li>Client Secrets (OAuth apps)</li>
              <li>Service Account Keys</li>
              <li>Bot Tokens (Slack, Discord)</li>
              <li>API Tokens (Jira, GitHub)</li>
              <li>Signing Secrets</li>
            </ul>
          </div>
          
          <div className="pt-3 border-t border-red-900">
            <p className="font-semibold text-yellow-300 mb-1">⚠️ Frontend-Safe Fields (Green)</p>
            <p>These can be included in frontend code:</p>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-gray-300">
              <li>Client IDs (public identifiers)</li>
              <li>Redirect URIs</li>
              <li>Tenant IDs</li>
              <li>Domain names</li>
            </ul>
          </div>

          <div className="pt-3 border-t border-red-900">
            <p className="font-semibold text-white mb-1">✅ Required: Backend Implementation</p>
            <p>Most integrations require a backend server to:</p>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-gray-300">
              <li>Securely store sensitive credentials</li>
              <li>Proxy API requests (hide secrets from browser)</li>
              <li>Handle OAuth token exchange</li>
              <li>Implement server-to-server authentication</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-3">Setup Instructions</h3>
        
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
          <p className="text-sm text-blue-200">
            <strong>Frontend-Only Setup (Limited):</strong> Only "Frontend Safe" fields can be configured here. 
            This provides OAuth flows for personal access but cannot scan organization-wide communications.
          </p>
        </div>

        <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
          <li>Enable the integrations you want to use</li>
          <li>Fill in ONLY the <span className="text-green-400 font-medium">"Frontend Safe"</span> fields</li>
          <li>For <span className="text-red-400 font-medium">"Backend Only"</span> fields, you MUST:
            <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
              <li>Set up a backend server (Node.js, Python, etc.)</li>
              <li>Store secrets as environment variables on the server</li>
              <li>Create API proxy endpoints</li>
              <li>See <code className="text-primary-400 bg-slate-900 px-1 rounded">BACKEND-SETUP-GUIDE.md</code></li>
            </ul>
          </li>
          <li>Click "Save Configuration" to save frontend-safe settings</li>
          <li>Restart the development server: <code className="text-primary-400 bg-slate-900 px-1 rounded">npm run dev</code></li>
        </ol>
        
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-sm text-yellow-300">
            <strong>Organization-Wide Scanning:</strong> Requires backend server with admin-level API permissions. 
            See <code className="text-primary-400 bg-slate-900 px-1 rounded">IMPLEMENTATION-GUIDE.md</code> for complete setup.
          </p>
        </div>
      </div>
    </div>
  );
}
