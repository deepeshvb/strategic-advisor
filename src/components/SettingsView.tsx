import { useState } from 'react';
import { Settings, Building2, Cpu, Bell } from 'lucide-react';
import IntegrationSettings from './IntegrationSettings';
import CompanyManagement from './CompanyManagement';
import LocalLLMSettings from './LocalLLMSettings';
import AlertSettings from './AlertSettings';

type SettingsTab = 'integrations' | 'companies' | 'llm' | 'alerts';

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('companies');

  const tabs = [
    { id: 'companies' as SettingsTab, icon: Building2, label: 'Companies' },
    { id: 'llm' as SettingsTab, icon: Cpu, label: 'LLM Strategy' },
    { id: 'integrations' as SettingsTab, icon: Settings, label: 'Integrations' },
    { id: 'alerts' as SettingsTab, icon: Bell, label: 'Alerts' },
  ];

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
    </div>
  );
}
