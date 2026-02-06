import { useState } from 'react';
import { Settings, Building2, Cpu, Bell, Users } from 'lucide-react';
import IntegrationSettings from './IntegrationSettings';
import CompanyManagement from './CompanyManagement';
import LocalLLMSettings from './LocalLLMSettings';
import AlertSettings from './AlertSettings';
import UserManagement from './UserManagement';
import { authService } from '../services/authService';

type SettingsTab = 'integrations' | 'companies' | 'llm' | 'alerts' | 'users';

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('companies');
  const currentUser = authService.getCurrentUser();

  // Filter tabs based on permissions
  const allTabs = [
    { id: 'companies' as SettingsTab, icon: Building2, label: 'Companies', permission: 'viewSettings' as const },
    { id: 'llm' as SettingsTab, icon: Cpu, label: 'LLM Strategy', permission: 'viewSettings' as const },
    { id: 'integrations' as SettingsTab, icon: Settings, label: 'Integrations', permission: 'viewSettings' as const },
    { id: 'alerts' as SettingsTab, icon: Bell, label: 'Alerts', permission: 'editAlerts' as const },
    { id: 'users' as SettingsTab, icon: Users, label: 'User Management', permission: 'addUsers' as const },
  ];

  const tabs = allTabs.filter(tab => authService.hasPermission(tab.permission));

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'companies' && <CompanyManagement />}
      {activeTab === 'llm' && <LocalLLMSettings />}
      {activeTab === 'integrations' && <IntegrationSettings />}
      {activeTab === 'alerts' && <AlertSettings />}
      {activeTab === 'users' && <UserManagement />}
    </div>
  );
}
