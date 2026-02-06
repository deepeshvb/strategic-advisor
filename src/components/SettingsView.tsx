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
    <div className="h-full flex flex-col bg-slate-900 overflow-hidden">
      {/* Tabs - Horizontal scrollable on mobile */}
      <div className="flex-shrink-0 border-b border-slate-700 bg-slate-800">
        <div className="flex overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 border-b-2 transition-colors whitespace-nowrap text-sm md:text-base ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 md:w-5 md:h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content - Vertical scroll only, no horizontal overflow */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-900">
        {activeTab === 'companies' && <CompanyManagement />}
        {activeTab === 'llm' && <LocalLLMSettings />}
        {activeTab === 'integrations' && <IntegrationSettings />}
        {activeTab === 'alerts' && <AlertSettings />}
        {activeTab === 'users' && <UserManagement />}
      </div>
    </div>
  );
}
