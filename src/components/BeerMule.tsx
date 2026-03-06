import { useState, useEffect, useCallback } from 'react';
import {
  Beer,
  Plus,
  Trash2,
  Play,
  Square,
  Instagram,
  ShoppingCart,
  Activity,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  FlaskConical,
  Store,
} from 'lucide-react';
import {
  beerMuleService,
  Brewery,
  ShopUrlEntry,
  TrackedBeer,
  PurchaseAttempt,
  MonitorEvent,
  BeerMuleConfig,
} from '../services/beerMuleService';

// ---------------------------------------------------------------------------
// Sub-tab type
// ---------------------------------------------------------------------------
type BeerMuleTab = 'watchlist' | 'activity' | 'purchases' | 'settings';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function BeerMule() {
  const [tab, setTab] = useState<BeerMuleTab>('watchlist');
  const [, setTick] = useState(0);

  useEffect(() => {
    return beerMuleService.subscribe(() => setTick(t => t + 1));
  }, []);

  const monitoring = beerMuleService.isMonitoring();

  const tabs: { id: BeerMuleTab; label: string; icon: typeof Beer }[] = [
    { id: 'watchlist', label: 'Watchlist', icon: Beer },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'purchases', label: 'Purchases', icon: ShoppingCart },
    { id: 'settings', label: 'Config', icon: SettingsIcon },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Pliny the Younger background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/images/pliny-the-younger.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className="absolute inset-0 z-0 bg-slate-900/85 backdrop-blur-sm" />

      {/* Header */}
      <div className="relative z-10 flex-shrink-0 p-4 md:p-6 border-b border-slate-700/80 bg-slate-800/70 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Beer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Beer Mule</h2>
              <p className="text-xs text-gray-400">Auto-purchase limited beer releases</p>
            </div>
          </div>

          <button
            onClick={() => monitoring ? beerMuleService.stopMonitoring() : beerMuleService.startMonitoring()}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              monitoring
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {monitoring ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {monitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
        </div>

        {monitoring && (
          <div className="mt-3 flex items-center gap-2 text-green-400 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Monitoring {beerMuleService.getBreweries().filter(b => b.enabled).length} breweries — polling every {beerMuleService.getConfig().pollIntervalSeconds}s
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="relative z-10 flex-shrink-0 border-b border-slate-700/80 bg-slate-800/70 backdrop-blur-md">
        <div className="flex overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 md:px-6 py-3 border-b-2 transition-colors whitespace-nowrap text-sm ${
                  tab === t.id
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-6">
        {tab === 'watchlist' && <WatchlistTab />}
        {tab === 'activity' && <ActivityTab />}
        {tab === 'purchases' && <PurchasesTab />}
        {tab === 'settings' && <ConfigTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Watchlist Tab
// ---------------------------------------------------------------------------
function WatchlistTab() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedBrewery, setExpandedBrewery] = useState<string | null>(null);
  const breweries = beerMuleService.getBreweries();

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Brewery Watchlist</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Brewery
        </button>
      </div>

      {showAddForm && <AddBreweryForm onClose={() => setShowAddForm(false)} />}

      {breweries.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Beer className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium text-gray-400">No breweries tracked yet</p>
          <p className="text-sm mt-1">Add a brewery to start monitoring for limited releases.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {breweries.map(b => (
            <BreweryCard
              key={b.id}
              brewery={b}
              expanded={expandedBrewery === b.id}
              onToggle={() => setExpandedBrewery(expandedBrewery === b.id ? null : b.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Add Brewery Form
// ---------------------------------------------------------------------------
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function AddBreweryForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [igHandle, setIgHandle] = useState('');
  const [shopUrls, setShopUrls] = useState<ShopUrlEntry[]>([
    { url: '', label: 'Weekday Shop', activeDays: [1, 2, 3, 4, 5] },
  ]);
  const [releaseDays, setReleaseDays] = useState<number[]>([2, 5]);
  const [releaseTime, setReleaseTime] = useState('12:00');
  const [maxQty, setMaxQty] = useState(2);
  const [keywords, setKeywords] = useState('');

  const toggleDay = (d: number) =>
    setReleaseDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()));

  const updateShopUrl = (idx: number, patch: Partial<ShopUrlEntry>) => {
    setShopUrls(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const toggleShopDay = (idx: number, day: number) => {
    setShopUrls(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      const days = s.activeDays.includes(day) ? s.activeDays.filter(d => d !== day) : [...s.activeDays, day].sort();
      return { ...s, activeDays: days };
    }));
  };

  const addShopUrl = () => {
    setShopUrls(prev => [...prev, { url: '', label: `Shop ${prev.length + 1}`, activeDays: [] }]);
  };

  const removeShopUrl = (idx: number) => {
    setShopUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const validShops = shopUrls.filter(s => s.url.trim());
    beerMuleService.addBrewery({
      name: name.trim(),
      instagramHandle: igHandle.trim().replace(/^@/, ''),
      shopUrl: validShops[0]?.url || '',
      shopUrls: validShops,
      releaseDays,
      releaseTimeHint: releaseTime,
      maxQuantity: maxQty,
      enabled: true,
      keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
    });
    onClose();
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-5 space-y-4">
      <h4 className="text-white font-semibold">Add Brewery</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Brewery Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Troon Brewing"
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            <Instagram className="inline w-3.5 h-3.5 mr-1" />
            Instagram Handle
          </label>
          <input
            value={igHandle}
            onChange={e => setIgHandle(e.target.value)}
            placeholder="e.g. troonbrewing"
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Max Quantity per Order</label>
          <input
            type="number"
            min={1}
            max={24}
            value={maxQty}
            onChange={e => setMaxQty(Number(e.target.value))}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Multiple Shop URLs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm text-gray-400">
            <Store className="inline w-3.5 h-3.5 mr-1" />
            Shop URLs (different sites for different days)
          </label>
          <button onClick={addShopUrl} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add Shop URL
          </button>
        </div>
        <div className="space-y-3">
          {shopUrls.map((shop, idx) => (
            <div key={idx} className="bg-slate-700/50 rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  value={shop.label}
                  onChange={e => updateShopUrl(idx, { label: e.target.value })}
                  placeholder="Label (e.g. Weekday Orders)"
                  className="w-40 bg-slate-700 text-white rounded px-2 py-1.5 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
                />
                <input
                  value={shop.url}
                  onChange={e => updateShopUrl(idx, { url: e.target.value })}
                  placeholder="https://troonbrewing.com/weekday-shop"
                  className="flex-1 bg-slate-700 text-white rounded px-2 py-1.5 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
                />
                {shopUrls.length > 1 && (
                  <button onClick={() => removeShopUrl(idx)} className="text-red-500 hover:text-red-400 px-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Active days:</span>
                {DAY_LABELS.map((label, d) => (
                  <button
                    key={d}
                    onClick={() => toggleShopDay(idx, d)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      shop.activeDays.includes(d)
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-600 text-gray-400 hover:bg-slate-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <span className="text-[10px] text-gray-600 ml-1">(empty = every day)</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">Troon example: add "Weekday Orders" (Mon–Fri) and "Weekend Orders" (Sat–Sun) with different URLs. Beer Mule picks the right shop based on the day.</p>
      </div>

      {/* Release days */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Typical Release Days</label>
        <div className="flex gap-2">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                releaseDays.includes(i)
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Release time + keywords */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Release Time (approx.)</label>
          <input
            type="time"
            value={releaseTime}
            onChange={e => setReleaseTime(e.target.value)}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Extra Keywords (comma-separated)</label>
          <input
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            placeholder="e.g. fresh cans, limited release"
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Add Brewery
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Brewery Card
// ---------------------------------------------------------------------------
function BreweryCard({
  brewery,
  expanded,
  onToggle,
}: {
  brewery: Brewery;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [showAddBeer, setShowAddBeer] = useState(false);
  const beers = beerMuleService.getBeersForBrewery(brewery.id);

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-750" onClick={onToggle}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${brewery.enabled ? 'bg-green-500' : 'bg-gray-600'}`} />
          <div className="min-w-0">
            <h4 className="text-white font-medium truncate">{brewery.name}</h4>
            <p className="text-xs text-gray-400 truncate">
              <Instagram className="inline w-3 h-3 mr-1" />
              @{brewery.instagramHandle}
              {(brewery.shopUrls?.length > 0 || brewery.shopUrl) && (
                <>
                  {' · '}
                  <Store className="inline w-3 h-3 mr-1" />
                  {brewery.shopUrls?.length > 1 ? `${brewery.shopUrls.length} shops` : 'Shop'}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-500 hidden md:inline">
            {brewery.releaseDays.map(d => DAY_LABELS[d]).join(', ')}
            {brewery.releaseTimeHint && ` @ ${brewery.releaseTimeHint}`}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-gray-300">
            Max {brewery.maxQuantity}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-700 p-4 space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => beerMuleService.updateBrewery(brewery.id, { enabled: !brewery.enabled })}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                brewery.enabled ? 'bg-green-600 text-white' : 'bg-slate-700 text-gray-400'
              }`}
            >
              {brewery.enabled ? '✓ Enabled' : 'Disabled'}
            </button>
            <button
              onClick={() => beerMuleService.simulateRelease(brewery.id)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Zap className="w-3 h-3" /> Simulate Release
            </button>
            {(brewery.shopUrls?.length > 0 ? brewery.shopUrls : brewery.shopUrl ? [{ url: brewery.shopUrl, label: 'Shop', activeDays: [] as number[] }] : []).map((shop, i) => (
              <a
                key={i}
                href={shop.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded text-xs font-medium transition-colors flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> {shop.label || 'Shop'}
              </a>
            ))}
            <button
              onClick={() => {
                if (confirm(`Remove ${brewery.name} from watchlist?`)) {
                  beerMuleService.removeBrewery(brewery.id);
                }
              }}
              className="px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-400 rounded text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>

          {/* Active shop for today */}
          {brewery.shopUrls?.length > 1 && (() => {
            const active = beerMuleService.getActiveShopUrl(brewery);
            return active ? (
              <div className="text-xs text-amber-400 bg-amber-900/20 border border-amber-700/30 rounded px-3 py-1.5">
                Today's active shop: <strong>{active.label}</strong> — {active.url}
              </div>
            ) : null;
          })()}

          {/* Tracked beers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm text-gray-300 font-medium">Tracked Beers ({beers.length})</h5>
              <button
                onClick={() => setShowAddBeer(!showAddBeer)}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Beer
              </button>
            </div>

            {showAddBeer && <AddBeerForm breweryId={brewery.id} onClose={() => setShowAddBeer(false)} />}

            {beers.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No specific beers tracked — agent will auto-buy any release from this brewery.</p>
            ) : (
              <div className="space-y-2">
                {beers.map(beer => (
                  <div key={beer.id} className="flex items-center justify-between bg-slate-700/50 rounded px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FlaskConical className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="text-sm text-white truncate">{beer.name}</span>
                      {beer.style && <span className="text-xs text-gray-500">({beer.style})</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${beer.autoBuy ? 'bg-green-800 text-green-300' : 'bg-slate-600 text-gray-400'}`}>
                        {beer.autoBuy ? 'Auto-buy' : 'Track only'}
                      </span>
                      {beer.maxQuantity && <span className="text-xs text-gray-500">qty {beer.maxQuantity}</span>}
                      <button
                        onClick={() => beerMuleService.removeBeer(beer.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Beer Form
// ---------------------------------------------------------------------------
function AddBeerForm({ breweryId, onClose }: { breweryId: string; onClose: () => void }) {
  const [name, setName] = useState('');
  const [style, setStyle] = useState('');
  const [autoBuy, setAutoBuy] = useState(true);
  const [maxQty, setMaxQty] = useState<number | undefined>(undefined);

  const handleSubmit = () => {
    if (!name.trim()) return;
    beerMuleService.addBeer({ breweryId, name: name.trim(), style: style.trim() || undefined, autoBuy, maxQuantity: maxQty });
    onClose();
  };

  return (
    <div className="bg-slate-700/50 rounded p-3 mb-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Beer name"
          className="bg-slate-700 text-white rounded px-2 py-1.5 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
        />
        <input
          value={style}
          onChange={e => setStyle(e.target.value)}
          placeholder="Style (optional)"
          className="bg-slate-700 text-white rounded px-2 py-1.5 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" checked={autoBuy} onChange={e => setAutoBuy(e.target.checked)} className="accent-amber-500" />
          Auto-buy
        </label>
        <input
          type="number"
          min={1}
          max={24}
          value={maxQty ?? ''}
          onChange={e => setMaxQty(e.target.value ? Number(e.target.value) : undefined)}
          placeholder="Max qty (uses brewery default)"
          className="bg-slate-700 text-white rounded px-2 py-1.5 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none w-48"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-white px-2 py-1">Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="text-xs bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 text-white px-3 py-1 rounded font-medium"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Tab
// ---------------------------------------------------------------------------
function ActivityTab() {
  const events = beerMuleService.getEvents(100);

  const getIcon = (type: MonitorEvent['type']) => {
    switch (type) {
      case 'release_detected': return <Zap className="w-4 h-4 text-amber-400" />;
      case 'purchase_started': return <ShoppingCart className="w-4 h-4 text-blue-400" />;
      case 'purchase_success': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'purchase_failed': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <>
      <h3 className="text-lg font-semibold text-white">Activity Log</h3>
      {events.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-gray-400">No activity yet — start monitoring to see events here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(evt => (
            <div key={evt.id} className="flex items-start gap-3 bg-slate-800 rounded-lg p-3 border border-slate-700">
              <div className="mt-0.5 flex-shrink-0">{getIcon(evt.type)}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white">{evt.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  <Clock className="inline w-3 h-3 mr-1" />
                  {evt.timestamp.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Purchases Tab
// ---------------------------------------------------------------------------
function PurchasesTab() {
  const purchases = beerMuleService.getPurchases();

  const statusBadge = (status: PurchaseAttempt['status']) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      success: { bg: 'bg-green-800', text: 'text-green-300', label: 'Success' },
      failed: { bg: 'bg-red-800', text: 'text-red-300', label: 'Failed' },
      sold_out: { bg: 'bg-orange-800', text: 'text-orange-300', label: 'Sold Out' },
      purchasing: { bg: 'bg-blue-800', text: 'text-blue-300', label: 'Purchasing…' },
      pending: { bg: 'bg-yellow-800', text: 'text-yellow-300', label: 'Pending' },
    };
    const s = map[status] || map.pending;
    return <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  return (
    <>
      <h3 className="text-lg font-semibold text-white">Purchase History</h3>
      {purchases.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-gray-400">No purchases yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map(p => (
            <div key={p.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-medium">{p.beerName}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">{p.breweryName} · {p.quantity}x</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {statusBadge(p.status)}
                  {p.totalPrice != null && <span className="text-sm text-green-400 font-medium">${p.totalPrice.toFixed(2)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>Detected: {p.detectedAt.toLocaleString()}</span>
                {p.completedAt && <span>Completed: {p.completedAt.toLocaleString()}</span>}
              </div>
              {p.errorMessage && <p className="text-xs text-red-400 mt-2">{p.errorMessage}</p>}
              {p.sourcePostUrl && (
                <a href={p.sourcePostUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-400 hover:text-amber-300 mt-1 inline-flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Source post
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Config Tab
// ---------------------------------------------------------------------------
function ConfigTab() {
  const [config, setConfig] = useState<BeerMuleConfig>(beerMuleService.getConfig());

  const save = useCallback((patch: Partial<BeerMuleConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    beerMuleService.updateConfig(patch);
  }, [config]);

  return (
    <>
      <h3 className="text-lg font-semibold text-white">Beer Mule Configuration</h3>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-5 space-y-5">
        {/* Polling */}
        <div>
          <h4 className="text-sm text-amber-400 font-semibold mb-3">Polling Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Normal Poll Interval (seconds)</label>
              <input
                type="number"
                min={5}
                max={300}
                value={config.pollIntervalSeconds}
                onChange={e => save({ pollIntervalSeconds: Number(e.target.value) })}
                className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Fast Poll Interval (seconds)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={config.fastPollIntervalSeconds}
                onChange={e => save({ fastPollIntervalSeconds: Number(e.target.value) })}
                className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Release Window (minutes ±)</label>
              <input
                type="number"
                min={5}
                max={120}
                value={config.releaseWindowMinutes}
                onChange={e => save({ releaseWindowMinutes: Number(e.target.value) })}
                className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Auto-purchase */}
        <div>
          <h4 className="text-sm text-amber-400 font-semibold mb-3">Auto-Purchase</h4>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoPurchaseEnabled}
              onChange={e => save({ autoPurchaseEnabled: e.target.checked })}
              className="accent-amber-500 w-4 h-4"
            />
            <span className="text-sm text-white">Enable auto-purchase when a release is detected</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-7">
            When enabled, Beer Mule will automatically attempt to purchase the max allowed quantity as soon as a release is detected on Instagram.
          </p>
        </div>

        {/* Instagram proxy */}
        <div>
          <h4 className="text-sm text-amber-400 font-semibold mb-3">Instagram Monitoring</h4>
          <label className="block text-xs text-gray-400 mb-1">Instagram Proxy / Scraper API URL</label>
          <input
            value={config.instagramProxyUrl}
            onChange={e => save({ instagramProxyUrl: e.target.value })}
            placeholder="https://your-ig-scraper.example.com"
            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Instagram requires authenticated access. Provide a proxy endpoint that returns recent posts as JSON.
            Without this, Beer Mule will log poll attempts but cannot fetch live posts.
          </p>
        </div>

        {/* AI Parsing */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.useAiParsing}
              onChange={e => save({ useAiParsing: e.target.checked })}
              className="accent-amber-500 w-4 h-4"
            />
            <span className="text-sm text-white">Use AI to parse release posts (uses configured LLM)</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-7">
            When enabled, release detection uses the configured LLM to understand post content instead of simple keyword matching. More accurate but adds latency.
          </p>
        </div>

        <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4">
          <h5 className="text-amber-400 font-semibold text-sm mb-2">How It Works</h5>
          <ol className="text-xs text-gray-300 space-y-1.5 list-decimal list-inside">
            <li>Beer Mule polls each brewery's Instagram feed at the configured interval.</li>
            <li>During the release window (±{config.releaseWindowMinutes} min of the hint time), polling accelerates to every {config.fastPollIntervalSeconds}s.</li>
            <li>When a post matches release keywords, the agent immediately triggers the auto-purchase flow.</li>
            <li>The purchase service navigates the brewery's online shop, adds the beer at max quantity, and checks out.</li>
            <li>All activity is logged in the Activity tab; purchase results appear in Purchases.</li>
          </ol>
        </div>
      </div>
    </>
  );
}
