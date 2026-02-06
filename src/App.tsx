import { useState, useEffect } from 'react';
import { MessageSquare, LayoutDashboard, Settings as SettingsIcon, Bot } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import SettingsView from './components/SettingsView';
import CompanySelector from './components/CompanySelector';
import { mockChannels, mockPriorities, mockInsights } from './services/mockData';
import { Channel, Priority, Insight } from './types';
import { companyService } from './services/companyService';
import { INITIAL_COMPANIES } from './data/initialCompanies';
import { backgroundMonitor } from './services/backgroundMonitor';

type View = 'chat' | 'dashboard' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('chat');
  const [channels, setChannels] = useState<Channel[]>(mockChannels);
  const [priorities, setPriorities] = useState<Priority[]>(mockPriorities);
  const [insights] = useState<Insight[]>(mockInsights);

  // Initialize companies on first load
  useEffect(() => {
    const existing = companyService.getAllCompanies();
    if (existing.length === 0) {
      console.log('🏢 Initializing default companies...');
      INITIAL_COMPANIES.forEach(company => {
        companyService.addCompany(company);
      });
    }
  }, []);

  // Start background monitoring
  useEffect(() => {
    console.log('🚀 Starting background monitoring service...');
    backgroundMonitor.start();

    // Cleanup on unmount
    return () => {
      backgroundMonitor.stop();
    };
  }, []);

  const handlePriorityToggle = (id: string) => {
    setPriorities((prev) =>
      prev.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p))
    );
  };

  const handleToggleChannel = (id: string) => {
    setChannels((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              connected: !c.connected,
              lastSync: !c.connected ? new Date() : c.lastSync,
            }
          : c
      )
    );
  };

  const context = {
    activeChannels: channels.filter((c) => c.connected),
    recentInsights: insights,
    priorities: priorities.filter((p) => !p.completed),
  };

  const navItems = [
    { id: 'chat' as View, icon: MessageSquare, label: 'Chat' },
    { id: 'dashboard' as View, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'settings' as View, icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Mobile-Responsive Sidebar */}
      <div className="hidden md:flex w-48 lg:w-64 bg-slate-800 border-r border-slate-700 flex-col">
        {/* Logo */}
        <div className="p-4 lg:p-6 border-b border-slate-700">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base lg:text-lg">Strategic</h1>
              <p className="text-gray-400 text-[10px] lg:text-xs">Coworker</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 lg:p-4">
          <div className="space-y-1 lg:space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-colors ${
                    currentView === item.id
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span className="font-medium text-sm lg:text-base">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Company Selector */}
        <div className="p-3 lg:p-4 border-t border-slate-700">
          <CompanySelector />
        </div>

        {/* Stats */}
        <div className="p-3 lg:p-4">
          <div className="bg-slate-700 rounded-lg p-3 lg:p-4">
            <h3 className="text-white font-medium mb-2 lg:mb-3 text-sm lg:text-base">Quick Stats</h3>
            <div className="space-y-1.5 lg:space-y-2 text-xs lg:text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Active Channels</span>
                <span className="text-white font-medium">
                  {channels.filter((c) => c.connected).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Open Priorities</span>
                <span className="text-white font-medium">
                  {priorities.filter((p) => !p.completed).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Urgent Items</span>
                <span className="text-red-400 font-medium">
                  {priorities.filter((p) => p.priority === 'urgent' && !p.completed).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-50">
        <div className="flex justify-around p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  currentView === item.id
                    ? 'text-primary-400'
                    : 'text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content - Mobile Responsive */}
      <div className="flex-1 flex flex-col mb-16 md:mb-0">
        {currentView === 'chat' && <ChatInterface context={context} />}
        {currentView === 'dashboard' && (
          <Dashboard
            channels={channels}
            priorities={priorities}
            insights={insights}
            onPriorityToggle={handlePriorityToggle}
          />
        )}
        {currentView === 'settings' && <SettingsView />}
      </div>
    </div>
  );
}

export default App;
