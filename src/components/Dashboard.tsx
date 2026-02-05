import { Mail, MessageSquare, Calendar, TrendingUp, AlertCircle, Lightbulb, FileText, CheckCircle2, BarChart3 } from 'lucide-react';
import { Priority, Insight, Channel } from '../types';
import { format, formatDistanceToNow } from 'date-fns';
import { getSyntheticDataStats } from '../services/syntheticData';
import { analyzePriorities, extractAllActionItems, detectPatterns } from '../services/aiEngine';

interface DashboardProps {
  channels: Channel[];
  priorities: Priority[];
  insights: Insight[];
  onPriorityToggle: (id: string) => void;
}

export default function Dashboard({ channels, priorities, insights, onPriorityToggle }: DashboardProps) {
  // Get comprehensive statistics
  const stats = getSyntheticDataStats();
  const actionItems = extractAllActionItems();
  const patterns = detectPatterns();
  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'teams':
      case 'slack':
        return <MessageSquare className="w-5 h-5" />;
      case 'calendar':
        return <Calendar className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-orange-400" />;
      case 'trend':
        return <TrendingUp className="w-5 h-5 text-blue-400" />;
      case 'suggestion':
        return <Lightbulb className="w-5 h-5 text-yellow-400" />;
      case 'summary':
        return <FileText className="w-5 h-5 text-purple-400" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500 bg-red-500 bg-opacity-10';
      case 'high':
        return 'border-orange-500 bg-orange-500 bg-opacity-10';
      case 'medium':
        return 'border-yellow-500 bg-yellow-500 bg-opacity-10';
      case 'low':
        return 'border-green-500 bg-green-500 bg-opacity-10';
      default:
        return 'border-gray-500 bg-gray-500 bg-opacity-10';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-gray-900';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Dashboard</h2>
        <p className="text-gray-400">Real-time overview of your communication channels and strategic priorities</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-6 h-6" />
            <span className="text-2xl font-bold">{stats.urgentItems}</span>
          </div>
          <p className="text-sm opacity-90">Urgent Items</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="w-6 h-6" />
            <span className="text-2xl font-bold">{stats.totalMessages}</span>
          </div>
          <p className="text-sm opacity-90">Total Messages</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="w-6 h-6" />
            <span className="text-2xl font-bold">{actionItems.length}</span>
          </div>
          <p className="text-sm opacity-90">Action Items</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-6 h-6" />
            <span className="text-2xl font-bold">{patterns.length}</span>
          </div>
          <p className="text-sm opacity-90">Patterns Detected</p>
        </div>
      </div>

      {/* Communication Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary-400" />
          Communication Breakdown
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-2xl font-bold text-white mb-1">{stats.teamsMessages}</div>
            <p className="text-sm text-gray-400">Teams Messages</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-2xl font-bold text-white mb-1">{stats.outlookEmails}</div>
            <p className="text-sm text-gray-400">Outlook Emails</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-2xl font-bold text-white mb-1">{stats.whatsappMessages}</div>
            <p className="text-sm text-gray-400">WhatsApp</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-2xl font-bold text-white mb-1">{stats.calendarEvents}</div>
            <p className="text-sm text-gray-400">Calendar Events</p>
          </div>
        </div>
      </div>

      {/* Connected Channels */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Connected Channels</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="bg-slate-800 rounded-lg p-4 border border-slate-700"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`${channel.connected ? 'text-primary-400' : 'text-gray-500'}`}>
                    {getChannelIcon(channel.type)}
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{channel.name}</h4>
                    <p className="text-sm text-gray-400 capitalize">{channel.type}</p>
                  </div>
                </div>
                <div
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    channel.connected
                      ? 'bg-green-500 bg-opacity-20 text-green-400'
                      : 'bg-gray-500 bg-opacity-20 text-gray-400'
                  }`}
                >
                  {channel.connected ? 'Connected' : 'Disconnected'}
                </div>
              </div>
              {channel.connected && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    Last sync: {channel.lastSync ? formatDistanceToNow(channel.lastSync, { addSuffix: true }) : 'Never'}
                  </span>
                  {channel.unreadCount !== undefined && channel.unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-primary-600 text-white rounded-full text-xs font-medium">
                      {channel.unreadCount} unread
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Recent Insights</h3>
        <div className="space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="bg-slate-800 rounded-lg p-4 border border-slate-700"
            >
              <div className="flex items-start gap-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <h4 className="text-white font-medium mb-1">{insight.title}</h4>
                  <p className="text-sm text-gray-400 mb-2">{insight.description}</p>
                  <div className="flex items-center gap-2">
                    {insight.channels.map((channel) => (
                      <span
                        key={channel}
                        className="text-xs px-2 py-0.5 bg-slate-700 text-gray-300 rounded"
                      >
                        {channel}
                      </span>
                    ))}
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(insight.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Priorities */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Your Priorities</h3>
        <div className="space-y-3">
          {priorities.map((priority) => (
            <div
              key={priority.id}
              className={`rounded-lg p-4 border-l-4 ${getPriorityColor(priority.priority)} ${
                priority.completed ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => onPriorityToggle(priority.id)}
                  className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    priority.completed
                      ? 'bg-primary-600 border-primary-600'
                      : 'border-gray-500 hover:border-primary-500'
                  }`}
                >
                  {priority.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h4
                      className={`text-white font-medium ${
                        priority.completed ? 'line-through' : ''
                      }`}
                    >
                      {priority.title}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${getPriorityBadgeColor(
                        priority.priority
                      )}`}
                    >
                      {priority.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{priority.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>Source: {priority.source}</span>
                    {priority.dueDate && (
                      <span>Due: {format(priority.dueDate, 'MMM dd, HH:mm')}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
