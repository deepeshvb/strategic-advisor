import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Zap, Clock, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface StarkConfig {
  enabled: boolean;
  criteria: string;
  dailyScheduleEnabled: boolean;
  dailyScheduleTime: string;
  hotAlertEnabled: boolean;
}

interface Recommendation {
  symbol: string;
  name?: string;
  action: string;
  reason?: string;
  hot?: boolean;
}

export default function StarkNavigator() {
  const [config, setConfig] = useState<StarkConfig>({
    enabled: false,
    criteria: '',
    dailyScheduleEnabled: false,
    dailyScheduleTime: '08:00',
    hotAlertEnabled: true,
  });
  const [fullConfig, setFullConfig] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [hotCount, setHotCount] = useState(0);
  const [fetchingRecs, setFetchingRecs] = useState(false);
  const [purchaseDescription, setPurchaseDescription] = useState('');
  const [purchaseResult, setPurchaseResult] = useState<{ action: string; reason: string; hot: boolean } | null>(null);
  const [evaluatingPurchase, setEvaluatingPurchase] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setFullConfig(data);
        const sn = data.starkNavigator || {};
        setConfig({
          enabled: sn.enabled === true,
          criteria: sn.criteria ?? '',
          dailyScheduleEnabled: sn.dailyScheduleEnabled === true,
          dailyScheduleTime: sn.dailyScheduleTime ?? '08:00',
          hotAlertEnabled: sn.hotAlertEnabled !== false,
        });
      }
    } catch (e) {
      console.warn('StarkNavigator config load failed:', e);
      setMessage({ type: 'error', text: 'Could not load config. Is the backend running?' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    if (!fullConfig) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = { ...fullConfig, starkNavigator: config };
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setFullConfig(updated);
        setMessage({ type: 'success', text: 'Settings saved.' });
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error || 'Save failed.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Could not save. Check backend.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleEvaluatePurchase = async () => {
    if (!purchaseDescription.trim()) return;
    setEvaluatingPurchase(true);
    setMessage(null);
    setPurchaseResult(null);
    try {
      const res = await fetch('/api/stark-navigator/evaluate-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: purchaseDescription.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPurchaseResult({ action: data.action, reason: data.reason || '', hot: data.hot === true });
        setMessage({ type: 'success', text: data.hot ? 'Exceptional deal – alert sent to WhatsApp + email.' : 'Evaluation done.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Evaluation failed.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Request failed. Is the backend running?' });
    } finally {
      setEvaluatingPurchase(false);
      setTimeout(() => setMessage(null), 6000);
    }
  };

  const handleGetRecommendations = async () => {
    setFetchingRecs(true);
    setMessage(null);
    try {
      const res = await fetch('/api/stark-navigator/recommendations', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (res.ok && data.success) {
        setRecommendations(data.recommendations || []);
        setHotCount((data.hot || []).length);
        setMessage({ type: 'success', text: `Got ${(data.recommendations || []).length} recommendations. ${(data.hot || []).length ? 'Hot alerts sent to WhatsApp + email.' : ''}` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to get recommendations.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Request failed. Is the backend running?' });
    } finally {
      setFetchingRecs(false);
      setTimeout(() => setMessage(null), 8000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-gray-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="config-card">
        <h2 className="config-heading flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center">
            <TrendingUp className="text-amber-400" size={24} />
          </div>
          StarkNavigator
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Advice on <strong>investments</strong> (e.g. stocks) and <strong>big purchases</strong> (cars, wine, real estate, art, luxury goods). Evaluates opportunities against your criteria with buy/hold/skip recommendations. Stock scan on-demand or daily digest; describe any purchase (car, property, bottle) for instant advice. Hot deals trigger automatic WhatsApp + email alerts.
        </p>

        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))}
              className="rounded border-gray-500 bg-gray-600 text-lobster-500 focus:ring-lobster-500"
            />
            <span className="text-sm font-medium text-white">Enable StarkNavigator</span>
          </label>

          <div>
            <label className="config-label">Your criteria (risk, sectors, goals)</label>
            <textarea
              value={config.criteria}
              onChange={(e) => setConfig((c) => ({ ...c, criteria: e.target.value }))}
              placeholder="e.g. Investments: moderate risk; tech and healthcare; long-term. Big purchases: cars – prefer CPO, low mileage; wine – collectible only; real estate – 3br in X area, max $Y; prefer quality over price."
              className="config-input w-full min-h-[100px]"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">Used by AI for both stock recommendations and big-purchase advice (cars, wine, real estate, etc.). Leave blank for general moderate-risk guidance.</p>
          </div>

          <div className="pt-4 border-t border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Clock size={16} />
              Daily digest
            </h3>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={config.dailyScheduleEnabled}
                onChange={(e) => setConfig((c) => ({ ...c, dailyScheduleEnabled: e.target.checked }))}
                className="rounded border-gray-500 bg-gray-600 text-lobster-500 focus:ring-lobster-500"
              />
              <span className="text-sm text-gray-400">Send daily recommendations at scheduled time</span>
            </label>
            <div className="flex items-center gap-2">
              <label className="config-label">Time</label>
              <input
                type="time"
                value={config.dailyScheduleTime}
                onChange={(e) => setConfig((c) => ({ ...c, dailyScheduleTime: e.target.value }))}
                className="config-input w-32"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Zap size={16} />
              Hot alerts
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.hotAlertEnabled}
                onChange={(e) => setConfig((c) => ({ ...c, hotAlertEnabled: e.target.checked }))}
                className="rounded border-gray-500 bg-gray-600 text-lobster-500 focus:ring-lobster-500"
              />
              <span className="text-sm text-gray-400">Send immediate WhatsApp + email for very hot, immediate buys</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? 'Saving…' : 'Save settings'}
            </button>
            {message && (
              <span className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-amber-400'}`}>
                {message.text}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="config-card">
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Evaluate a big purchase</h3>
        <p className="text-sm text-gray-500 mb-3">
          Describe a car, property, wine, or other big-ticket item you’re considering. StarkNavigator will compare it to your criteria and recommend buy, hold, or skip. Exceptional deals trigger instant WhatsApp + email.
        </p>
        <textarea
          value={purchaseDescription}
          onChange={(e) => {
            setPurchaseResult(null);
            setPurchaseDescription(e.target.value);
          }}
          placeholder="e.g. 2022 Porsche Cayenne CPO, 18k mi, $78k. Or: Bordeaux 2019, $Y. Or: 3br condo Downtown, listed $Z."
          className="config-input w-full min-h-[80px] mb-3"
          rows={3}
        />
        <button
          type="button"
          onClick={handleEvaluatePurchase}
          disabled={evaluatingPurchase || !purchaseDescription.trim()}
          className="btn-secondary flex items-center gap-2 mb-6"
        >
          <RefreshCw size={18} className={evaluatingPurchase ? 'animate-spin' : ''} />
          {evaluatingPurchase ? 'Evaluating…' : 'Get advice'}
        </button>
        {purchaseResult && (
          <div className={`p-4 rounded-lg border ${purchaseResult.hot ? 'bg-amber-900/20 border-amber-600/40' : 'bg-gray-800/50 border-gray-700'}`}>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`font-medium px-2 py-0.5 rounded text-sm ${
                purchaseResult.action === 'buy' ? 'bg-green-900/50 text-green-400' :
                purchaseResult.action === 'hold' ? 'bg-amber-900/30 text-amber-400' : 'bg-gray-700 text-gray-400'
              }`}>
                {purchaseResult.action}
              </span>
              {purchaseResult.hot && (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">
                  <AlertCircle size={12} /> Hot deal – alert sent
                </span>
              )}
            </div>
            <p className="text-sm text-gray-300">{purchaseResult.reason}</p>
          </div>
        )}
      </section>

      <section className="config-card">
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Stock recommendations</h3>
        <p className="text-sm text-gray-500 mb-4">
          Scans current opportunities (stocks; mock or Alpha Vantage if API key set), evaluates against your criteria, and returns buy/hold/skip. Hot picks trigger instant WhatsApp + email.
        </p>
        <button
          type="button"
          onClick={handleGetRecommendations}
          disabled={fetchingRecs}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw size={18} className={fetchingRecs ? 'animate-spin' : ''} />
          {fetchingRecs ? 'Scanning & evaluating…' : 'Get recommendations now'}
        </button>

        {recommendations.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              Latest recommendations
            </h4>
            <ul className="space-y-2">
              {recommendations.map((r, i) => (
                <li key={`${r.symbol}-${i}`} className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                  <span className="font-mono font-medium text-white">{r.symbol}</span>
                  {r.name && <span className="text-gray-400 text-sm">{r.name}</span>}
                  <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                    r.action === 'buy' ? 'bg-green-900/50 text-green-400' :
                    r.action === 'hold' ? 'bg-amber-900/30 text-amber-400' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {r.action}
                  </span>
                  {r.hot && (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">
                      <AlertCircle size={12} /> HOT
                    </span>
                  )}
                  {r.reason && <span className="text-sm text-gray-500 w-full mt-1">{r.reason}</span>}
                </li>
              ))}
            </ul>
            {hotCount > 0 && (
              <p className="text-xs text-amber-400 mt-2">Hot alerts were sent to your Contact email and WhatsApp.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
