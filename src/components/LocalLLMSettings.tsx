import { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, XCircle, RefreshCw, Download, Lock } from 'lucide-react';
import { localLLMService, RECOMMENDED_MODELS } from '../services/localLLMService';

export default function LocalLLMSettings() {
  const [status, setStatus] = useState<{ running: boolean; models: string[] }>({ running: false, models: [] });
  const [selectedModel, setSelectedModel] = useState('llama3.1:8b');
  const [checking, setChecking] = useState(false);
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434');
  // BUG FIX: Use React state instead of reading localStorage on every render
  const [isLocalEnabled, setIsLocalEnabled] = useState(
    localStorage.getItem('use_local_llm') !== 'false'
  );

  useEffect(() => {
    checkOllamaStatus();
    loadConfig();
  }, []);

  const loadConfig = () => {
    const saved = localStorage.getItem('ollama_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setSelectedModel(config.model || 'llama3.1:8b');
        setBaseUrl(config.baseUrl || 'http://localhost:11434');
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    }
  };

  const checkOllamaStatus = async () => {
    setChecking(true);
    try {
      const result = await localLLMService.checkStatus();
      setStatus(result);
    } catch (error) {
      setStatus({ running: false, models: [] });
    }
    setChecking(false);
  };

  const handleSave = () => {
    localLLMService.configure({
      baseUrl,
      model: selectedModel,
    });
    alert('Configuration saved! Restart the app for changes to take effect.');
  };

  const handleEnableLocal = () => {
    localStorage.setItem('use_local_llm', 'true');
    localStorage.removeItem('use_hybrid_llm'); // Clear hybrid mode
    setIsLocalEnabled(true);
    alert('✅ Local LLM enabled! All queries will now use Ollama (100% private).');
  };

  const handleDisableLocal = () => {
    localStorage.setItem('use_local_llm', 'false');
    localStorage.removeItem('use_hybrid_llm'); // Clear hybrid mode
    setIsLocalEnabled(false);
    alert('⚠️ Cloud API enabled. WARNING: Company data will be sent to Anthropic.');
  };

  const handleEnableHybrid = () => {
    localStorage.setItem('use_hybrid_llm', 'true');
    localStorage.setItem('use_local_llm', 'true'); // Enable local as base
    setIsLocalEnabled(true);
    alert('🔄 Hybrid mode enabled! Local LLM for sensitive queries, Cloud API for non-sensitive.');
  };

  const isHybridEnabled = localStorage.getItem('use_hybrid_llm') === 'true';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Local LLM Configuration</h2>
        <p className="text-gray-400">100% Private AI - Your data NEVER leaves your computer</p>
      </div>

      {/* Privacy Banner */}
      <div className="bg-green-900/20 border-2 border-green-700/50 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <Lock className="w-8 h-8 text-green-400 flex-shrink-0" />
          <div>
            <h3 className="text-green-400 font-semibold text-lg mb-2">Complete Privacy & Security</h3>
            <p className="text-green-200 mb-3">
              With local LLM (Ollama), ALL your sensitive company data is processed on your own machine. 
              Nothing is ever transmitted to cloud services.
            </p>
            <ul className="text-green-200 text-sm space-y-1">
              <li>✅ Organization-wide email/Teams scanning stays local</li>
              <li>✅ Strategic decisions and queries never leave your network</li>
              <li>✅ Competitor intelligence protected</li>
              <li>✅ Financial data secured</li>
              <li>✅ Zero API costs</li>
              <li>✅ Works offline</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary-400" />
            Ollama Status
          </h3>
          <button
            onClick={checkOllamaStatus}
            disabled={checking}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            Check Status
          </button>
        </div>

        <div className="flex items-center gap-3 mb-3">
          {status.running ? (
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          ) : (
            <XCircle className="w-6 h-6 text-red-400" />
          )}
          <div>
            <p className={`font-medium ${status.running ? 'text-green-400' : 'text-red-400'}`}>
              {status.running ? 'Ollama is Running' : 'Ollama is Not Running'}
            </p>
            <p className="text-sm text-gray-400">
              {status.running 
                ? `${status.models.length} model(s) installed` 
                : 'Install Ollama to enable local AI'}
            </p>
          </div>
        </div>

        {!status.running && (
          <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
            <p className="text-yellow-200 text-sm mb-2">
              <strong>Ollama Not Detected</strong>
            </p>
            <ol className="text-yellow-300 text-sm space-y-1 list-decimal list-inside">
              <li>Download from <a href="https://ollama.com/download" target="_blank" className="underline text-yellow-200">ollama.com/download</a></li>
              <li>Install and start Ollama</li>
              <li>Run: <code className="bg-slate-900 px-1.5 py-0.5 rounded">ollama pull llama3.1:8b</code></li>
              <li>Refresh this page</li>
            </ol>
          </div>
        )}

        {status.running && status.models.length === 0 && (
          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
            <p className="text-blue-200 text-sm mb-2">
              <strong>No Models Installed</strong>
            </p>
            <p className="text-blue-300 text-sm">
              Run one of these commands to download a model:
            </p>
            <div className="mt-2 space-y-1">
              {RECOMMENDED_MODELS.slice(0, 2).map(model => (
                <code key={model.name} className="block bg-slate-900 px-2 py-1 rounded text-sm text-blue-200">
                  ollama pull {model.name}
                </code>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Model Selection */}
      {status.running && status.models.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Model Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              >
                {status.models.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Currently installed on your machine
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ollama API URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: http://localhost:11434
              </p>
            </div>

            <button
              onClick={handleSave}
              className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* Recommended Models */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Recommended Models</h3>
        
        <div className="space-y-3">
          {RECOMMENDED_MODELS.map(model => (
            <div
              key={model.name}
              className={`p-4 rounded-lg border-2 ${
                model.recommended
                  ? 'bg-primary-900/20 border-primary-700/50'
                  : 'bg-slate-900/50 border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <code className="text-primary-400 font-mono text-sm">{model.name}</code>
                    {model.recommended && (
                      <span className="px-2 py-0.5 bg-primary-600 text-white text-xs rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{model.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Size:</span>
                  <span className="text-white ml-1">{model.size}</span>
                </div>
                <div>
                  <span className="text-gray-500">RAM:</span>
                  <span className="text-white ml-1">{model.ram}</span>
                </div>
                <div>
                  <span className="text-gray-500">Speed:</span>
                  <span className="text-white ml-1">{model.speed}</span>
                </div>
                <div>
                  <span className="text-gray-500">Quality:</span>
                  <span className="text-white ml-1">{model.performance}</span>
                </div>
              </div>
              {!status.models.includes(model.name) && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <code className="text-xs text-gray-400">
                    ollama pull {model.name}
                  </code>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* LLM Strategy */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">LLM Strategy</h3>
        
        <div className="space-y-4">
          {/* Current Mode */}
          <div className={`p-4 rounded-lg border-2 ${
            isHybridEnabled
              ? 'bg-blue-900/20 border-blue-700/50'
              : isLocalEnabled 
              ? 'bg-green-900/20 border-green-700/50' 
              : 'bg-red-900/20 border-red-700/50'
          }`}>
            <p className={`font-medium mb-2 ${
              isHybridEnabled ? 'text-blue-400' : isLocalEnabled ? 'text-green-400' : 'text-red-400'
            }`}>
              {isHybridEnabled 
                ? '🔄 Using Hybrid Mode (Smart Selection)' 
                : isLocalEnabled 
                ? '🔒 Using Local LLM (Privacy Mode)' 
                : '☁️ Using Cloud API'}
            </p>
            <p className="text-sm text-gray-300">
              {isHybridEnabled
                ? 'Automatically uses Local LLM for sensitive queries, Cloud API for general questions.'
                : isLocalEnabled 
                ? 'All AI processing happens locally. Your data NEVER leaves your computer.'
                : 'Company data is sent to Anthropic servers for processing.'}
            </p>
          </div>

          {/* Strategy Options */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-300">Choose your strategy:</p>
            
            {/* Local Only */}
            <button
              onClick={handleEnableLocal}
              disabled={!status.running}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                isLocalEnabled && !isHybridEnabled && status.running
                  ? 'border-green-600 bg-green-900/20'
                  : 'border-slate-700 bg-slate-900 hover:border-green-600/50'
              } ${!status.running ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">Local Only (Recommended)</p>
                    {isLocalEnabled && !isHybridEnabled && (
                      <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded">Active</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    100% private, $0 cost, works offline. Use Ollama for all queries.
                  </p>
                  {!status.running && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠️ Requires Ollama to be running
                    </p>
                  )}
                </div>
              </div>
            </button>

            {/* Cloud Only */}
            <button
              onClick={handleDisableLocal}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                !isLocalEnabled && !isHybridEnabled
                  ? 'border-red-600 bg-red-900/20'
                  : 'border-slate-700 bg-slate-900 hover:border-red-600/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 flex items-center justify-center text-red-400 flex-shrink-0 mt-0.5">☁️</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">Cloud API Only</p>
                    {!isLocalEnabled && !isHybridEnabled && (
                      <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded">Active</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Fast responses, requires API key, ~$0.01-0.10 per query.
                  </p>
                  <p className="text-xs text-red-400 mt-1">
                    ⚠️ Company data sent to Anthropic servers
                  </p>
                </div>
              </div>
            </button>

            {/* Hybrid Mode */}
            <button
              onClick={handleEnableHybrid}
              disabled={!status.running}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                isHybridEnabled
                  ? 'border-blue-600 bg-blue-900/20'
                  : 'border-slate-700 bg-slate-900 hover:border-blue-600/50'
              } ${!status.running ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 flex items-center justify-center text-blue-400 flex-shrink-0 mt-0.5">🔄</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">Hybrid Mode (Smart)</p>
                    {isHybridEnabled && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">Active</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Local LLM for sensitive company data, Cloud API for general queries. Best of both worlds.
                  </p>
                  {!status.running && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠️ Requires Ollama for local processing
                    </p>
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Setup Guide */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-3">Setup Instructions</h3>
        <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
          <li>Download Ollama from <a href="https://ollama.com/download" target="_blank" className="text-primary-400 hover:underline">ollama.com/download</a></li>
          <li>Install and start Ollama (runs automatically on most systems)</li>
          <li>Open terminal and run: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-primary-400">ollama pull llama3.1:8b</code></li>
          <li>Wait for download (4.7GB) - takes 2-10 minutes depending on internet speed</li>
          <li>Click "Check Status" above to verify</li>
          <li>Select your model and click "Save Configuration"</li>
          <li>Click "Enable Local LLM" for complete privacy</li>
        </ol>

        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
          <p className="text-blue-200 text-sm">
            <strong>First-time use?</strong> See <code className="bg-slate-900 px-1 rounded">OLLAMA-SETUP.md</code> for detailed guide.
          </p>
        </div>
      </div>
    </div>
  );
}
