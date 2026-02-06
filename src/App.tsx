import { useState } from 'react';
import { MessageSquare, LayoutDashboard, Settings as SettingsIcon, Bot } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import SettingsView from './components/SettingsView';
import { mockChannels, mockPriorities, mockInsights } from './services/mockData';
import { Channel, Priority, Insight } from './types';

type View = 'chat' | 'dashboard' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('chat');
  const [channels, setChannels] = useState<Channel[]>(mockChannels);
  const [priorities, setPriorities] = useState<Priority[]>(mockPriorities);
  const [insights] = useState<Insight[]>(mockInsights);

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
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Strategic</h1>
              <p className="text-gray-400 text-xs">Coworker</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    currentView === item.id
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Stats */}
        <div className="p-4 border-t border-slate-700">
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Quick Stats</h3>
            <div className="space-y-2 text-sm">
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
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
