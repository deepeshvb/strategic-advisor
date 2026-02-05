import { CheckCircle2, AlertCircle, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { realDataService } from '../services/realDataService';

export default function IntegrationStatus() {
  const [configured, setConfigured] = useState<string[]>([]);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    const integrations = realDataService.getConfiguredIntegrations();
    setConfigured(integrations);
  }, []);

  const hasIntegrations = configured.length > 0;

  return (
    <div className="bg-slate-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-400" />
          Integration Status
        </h3>
        <button
          onClick={() => setShowSetup(!showSetup)}
          className="text-sm text-primary-400 hover:text-primary-300"
        >
          {showSetup ? 'Hide' : 'Setup Guide'}
        </button>
      </div>

      {!hasIntegrations && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-yellow-200 font-medium">No Real Integrations Configured</p>
              <p className="text-yellow-300/80 text-sm mt-1">
                Currently using synthetic demo data. Configure real integrations to connect your actual channels.
              </p>
            </div>
          </div>
        </div>
      )}

      {showSetup && (
        <div className="bg-slate-700/50 rounded-lg p-4 mb-3">
          <p className="text-gray-300 text-sm mb-2">
            To connect real data sources:
          </p>
          <ol className="text-sm text-gray-400 space-y-1 ml-4 list-decimal">
            <li>Open <code className="text-primary-400 bg-slate-900/50 px-1 rounded">REAL-INTEGRATIONS-SETUP.md</code></li>
            <li>Follow setup instructions for your platforms</li>
            <li>Add API keys to your <code className="text-primary-400 bg-slate-900/50 px-1 rounded">.env</code> file</li>
            <li>Restart the dev server</li>
          </ol>
        </div>
      )}

      {hasIntegrations && (
        <div className="space-y-2">
          <p className="text-sm text-gray-400 mb-2">Connected Integrations:</p>
          {configured.map((integration) => (
            <div
              key={integration}
              className="flex items-center gap-2 bg-slate-700/50 rounded px-3 py-2"
            >
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-gray-200 text-sm">{integration}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-700">
        <p className="text-xs text-gray-500">
          {hasIntegrations ? (
            <>Real data is being used</>
          ) : (
            <>Demo mode active - Configure integrations to use real data</>
          )}
        </p>
      </div>
    </div>
  );
}
