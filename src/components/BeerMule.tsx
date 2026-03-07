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
  Search,
  MapPin,
  MessageCircle,
  CreditCard,
} from 'lucide-react';
import {
  beerMuleService,
  Brewery,
  ShopUrlEntry,
  ShopUrlMode,
  PaymentProvider,
  PaymentProviderConfig,
  PAYMENT_PROVIDER_PATTERNS,
  SavedPaymentMethod,
  BeerHunt,
  BeerHuntSource,
  BeerSighting,
  TrackedBeer,
  PurchaseAttempt,
  MonitorEvent,
  BeerMuleConfig,
} from '../services/beerMuleService';

// ---------------------------------------------------------------------------
// Sub-tab type
// ---------------------------------------------------------------------------
type BeerMuleTab = 'watchlist' | 'beerhunts' | 'activity' | 'purchases' | 'settings';

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
    { id: 'watchlist', label: 'Breweries', icon: Beer },
    { id: 'beerhunts', label: 'Beer Hunts', icon: Search },
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
        {tab === 'beerhunts' && <BeerHuntsTab />}
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
  const [shopUrlMode, setShopUrlMode] = useState<ShopUrlMode>('from_post');
  const [shopUrls, setShopUrls] = useState<ShopUrlEntry[]>([
    { url: '', label: 'Weekday Shop', activeDays: [1, 2, 3, 4, 5] },
  ]);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('square');
  const [autoCheckout, setAutoCheckout] = useState(true);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [shipAddress, setShipAddress] = useState('');
  const [shipCity, setShipCity] = useState('');
  const [shipState, setShipState] = useState('');
  const [shipZip, setShipZip] = useState('');
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
    const providerConfig: PaymentProviderConfig | undefined = shopUrlMode === 'from_post' ? {
      provider: paymentProvider,
      urlPatterns: PAYMENT_PROVIDER_PATTERNS[paymentProvider] || [],
      checkoutDetails: buyerName.trim() ? {
        fullName: buyerName.trim(),
        email: buyerEmail.trim(),
        phone: buyerPhone.trim() || undefined,
        shippingAddress: shipAddress.trim() || undefined,
        shippingCity: shipCity.trim() || undefined,
        shippingState: shipState.trim() || undefined,
        shippingZip: shipZip.trim() || undefined,
      } : undefined,
      autoCheckout,
    } : undefined;
    beerMuleService.addBrewery({
      name: name.trim(),
      instagramHandle: igHandle.trim().replace(/^@/, ''),
      shopUrl: validShops[0]?.url || '',
      shopUrls: shopUrlMode === 'fixed' ? validShops : [],
      shopUrlMode,
      shopUrlPatterns: providerConfig?.urlPatterns || [],
      paymentProvider: providerConfig,
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

      {/* Shop URL Mode */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">
          <Store className="inline w-3.5 h-3.5 mr-1" />
          How does this brewery publish ordering links?
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setShopUrlMode('from_post')}
            className={`flex-1 p-3 rounded-lg border text-left text-sm transition-colors ${
              shopUrlMode === 'from_post'
                ? 'border-amber-500 bg-amber-900/20 text-white'
                : 'border-slate-600 bg-slate-700/50 text-gray-400 hover:border-slate-500'
            }`}
          >
            <strong className="block mb-1">URL in each post</strong>
            <span className="text-xs">Brewery posts a unique ordering link (e.g. Square) in each release post. Beer Mule extracts it automatically.</span>
          </button>
          <button
            onClick={() => setShopUrlMode('fixed')}
            className={`flex-1 p-3 rounded-lg border text-left text-sm transition-colors ${
              shopUrlMode === 'fixed'
                ? 'border-amber-500 bg-amber-900/20 text-white'
                : 'border-slate-600 bg-slate-700/50 text-gray-400 hover:border-slate-500'
            }`}
          >
            <strong className="block mb-1">Fixed shop URL(s)</strong>
            <span className="text-xs">Brewery has a permanent online shop (or different weekday/weekend URLs).</span>
          </button>
        </div>
      </div>

      {/* URL-from-post mode: payment provider config */}
      {shopUrlMode === 'from_post' && (
        <div className="bg-amber-900/10 border border-amber-700/30 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Payment Provider</label>
            <div className="flex gap-2 flex-wrap">
              {(['square', 'shopify', 'woocommerce', 'bigcommerce', 'other'] as PaymentProvider[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPaymentProvider(p)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize ${
                    paymentProvider === p ? 'bg-amber-600 text-white' : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                  }`}
                >
                  {p === 'woocommerce' ? 'WooCommerce' : p === 'bigcommerce' ? 'BigCommerce' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Beer Mule knows each provider's URL patterns (e.g. Square → <code className="text-amber-400">square.site</code>).
              It extracts the ordering link from the Instagram post automatically.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={autoCheckout} onChange={e => setAutoCheckout(e.target.checked)} className="accent-amber-500 w-4 h-4" />
            <span className="text-sm text-white">Auto-checkout (place order immediately)</span>
          </label>
          <p className="text-xs text-gray-500 ml-6 -mt-2">
            When OFF, Beer Mule detects the release and alerts you with the link — you complete checkout manually.
          </p>

          {autoCheckout && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 font-medium">Your Checkout Details</p>
              <p className="text-xs text-gray-500 -mt-2">Pre-filled at checkout so the order goes through instantly. No seller account needed — just your info as a buyer.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Full Name *"
                  className="bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none" />
                <input value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="Email *"
                  className="bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none" />
                <input value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="Phone (optional)"
                  className="bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none" />
                <input value={shipAddress} onChange={e => setShipAddress(e.target.value)} placeholder="Shipping Address"
                  className="bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none" />
                <input value={shipCity} onChange={e => setShipCity(e.target.value)} placeholder="City"
                  className="bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none" />
                <div className="flex gap-2">
                  <input value={shipState} onChange={e => setShipState(e.target.value)} placeholder="State"
                    className="w-24 bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none" />
                  <input value={shipZip} onChange={e => setShipZip(e.target.value)} placeholder="ZIP"
                    className="w-28 bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none" />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Card details are entered separately in Config → secure payment. Never stored in plain text.
              </p>
            </div>
          )}

          <div className="bg-slate-800/50 rounded p-3">
            <p className="text-xs text-amber-300 font-medium mb-1">How it works for {name || 'this brewery'}:</p>
            <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
              <li>@{igHandle || 'brewery'} posts on Instagram announcing a release</li>
              <li>Beer Mule instantly scans the post for a {paymentProvider === 'square' ? 'Square' : paymentProvider} URL</li>
              <li>Extracts the unique ordering link (different every release)</li>
              <li>{autoCheckout ? 'Navigates to the link, fills your details, adds max quantity, and checks out' : 'Sends you a WhatsApp alert with the ordering link'}</li>
            </ol>
          </div>
        </div>
      )}

      {/* Fixed shop URLs */}
      {shopUrlMode === 'fixed' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm text-gray-400">Shop URLs (different sites for different days)</label>
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
                    placeholder="https://brewery.com/shop"
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
        </div>
      )}

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
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(brewery.name);
  const [editIg, setEditIg] = useState(brewery.instagramHandle);
  const [editMaxQty, setEditMaxQty] = useState(brewery.maxQuantity);
  const [editReleaseDays, setEditReleaseDays] = useState(brewery.releaseDays);
  const [editReleaseTime, setEditReleaseTime] = useState(brewery.releaseTimeHint || '');
  const [editKeywords, setEditKeywords] = useState(brewery.keywords.join(', '));
  const beers = beerMuleService.getBeersForBrewery(brewery.id);

  const startEdit = () => {
    setEditName(brewery.name);
    setEditIg(brewery.instagramHandle);
    setEditMaxQty(brewery.maxQuantity);
    setEditReleaseDays(brewery.releaseDays);
    setEditReleaseTime(brewery.releaseTimeHint || '');
    setEditKeywords(brewery.keywords.join(', '));
    setEditing(true);
  };

  const saveEdit = () => {
    beerMuleService.updateBrewery(brewery.id, {
      name: editName.trim(),
      instagramHandle: editIg.trim().replace(/^@/, ''),
      maxQuantity: editMaxQty,
      releaseDays: editReleaseDays,
      releaseTimeHint: editReleaseTime || undefined,
      keywords: editKeywords.split(',').map(k => k.trim()).filter(Boolean),
    });
    setEditing(false);
  };

  const toggleEditDay = (d: number) =>
    setEditReleaseDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()));

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
              {' · '}
              {brewery.shopUrlMode === 'from_post' ? (
                <span className="text-amber-400">
                  {brewery.paymentProvider?.provider
                    ? `${brewery.paymentProvider.provider.charAt(0).toUpperCase() + brewery.paymentProvider.provider.slice(1)} (from post)`
                    : 'URL from post'}
                </span>
              ) : (brewery.shopUrls?.length > 0 || brewery.shopUrl) ? (
                <>
                  <Store className="inline w-3 h-3 mr-1" />
                  {brewery.shopUrls?.length > 1 ? `${brewery.shopUrls.length} shops` : 'Shop'}
                </>
              ) : null}
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

          {/* Inline edit form */}
          {editing ? (
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
              <h5 className="text-sm text-white font-medium">Edit Brewery</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Brewery Name"
                  className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none" />
                <input value={editIg} onChange={e => setEditIg(e.target.value)} placeholder="Instagram Handle"
                  className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none" />
                <input type="number" min={1} max={24} value={editMaxQty} onChange={e => setEditMaxQty(Number(e.target.value))} placeholder="Max Qty"
                  className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none" />
                <input type="time" value={editReleaseTime} onChange={e => setEditReleaseTime(e.target.value)}
                  className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Release Days</label>
                <div className="flex gap-2">
                  {DAY_LABELS.map((label, i) => (
                    <button key={i} onClick={() => toggleEditDay(i)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        editReleaseDays.includes(i) ? 'bg-amber-600 text-white' : 'bg-slate-600 text-gray-400 hover:bg-slate-500'
                      }`}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Extra Keywords (comma-separated)</label>
                <input value={editKeywords} onChange={e => setEditKeywords(e.target.value)} placeholder="fresh cans, limited release"
                  className="w-full bg-slate-700 text-white rounded px-3 py-1.5 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
                <button onClick={saveEdit} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium">Save</button>
              </div>
            </div>
          ) : (
            <>
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
              onClick={startEdit}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
            >
              Edit
            </button>
            <button
              onClick={() => beerMuleService.testRealPosts(brewery.id)}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Search className="w-3 h-3" /> Test Real Posts
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
            </>
          )}
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
// Beer Hunts Tab — track beers by name at bars/restaurants in your area
// ---------------------------------------------------------------------------
function BeerHuntsTab() {
  const [showAddForm, setShowAddForm] = useState(false);
  const hunts = beerMuleService.getHunts();
  const sightings = beerMuleService.getSightings();

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Beer Hunts</h3>
          <p className="text-xs text-gray-400 mt-0.5">Track specific beers at bars & restaurants near you. Get WhatsApp alerts when spotted.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Beer Hunt
        </button>
      </div>

      {showAddForm && <AddBeerHuntForm onClose={() => setShowAddForm(false)} />}

      {hunts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium text-gray-400">No beer hunts yet</p>
          <p className="text-sm mt-1">Add a beer to track at local bars, pubs, and restaurants.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {hunts.map(hunt => (
            <div key={hunt.id} className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-medium flex items-center gap-2">
                    <Search className="w-4 h-4 text-amber-400" />
                    {hunt.beerName}
                    {hunt.breweryName && <span className="text-xs text-gray-500">by {hunt.breweryName}</span>}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    <MapPin className="inline w-3 h-3 mr-1" />
                    {hunt.searchArea} ({hunt.radiusMiles}mi)
                    {hunt.alertWhatsApp && (
                      <>
                        {' · '}
                        <MessageCircle className="inline w-3 h-3 mr-1 text-green-400" />
                        <span className="text-green-400">WhatsApp alerts ON</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Sources: {hunt.sources.join(', ')} · {hunt.style ? `Style: ${hunt.style}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => beerMuleService.updateHunt(hunt.id, { enabled: !hunt.enabled })}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      hunt.enabled ? 'bg-green-600 text-white' : 'bg-slate-700 text-gray-400'
                    }`}
                  >
                    {hunt.enabled ? '✓ Active' : 'Paused'}
                  </button>
                  <button
                    onClick={() => beerMuleService.simulateSighting(hunt.id)}
                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3" /> Simulate
                  </button>
                  <button
                    onClick={() => { if (confirm(`Remove hunt for "${hunt.beerName}"?`)) beerMuleService.removeHunt(hunt.id); }}
                    className="px-2 py-1 bg-red-900/40 hover:bg-red-800/60 text-red-400 rounded text-xs font-medium"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Sightings for this hunt */}
              {(() => {
                const huntSightings = sightings.filter(s => s.huntId === hunt.id);
                if (huntSightings.length === 0) return (
                  <p className="text-xs text-gray-600 mt-3 italic">No sightings yet. Click "Simulate" to test.</p>
                );
                return (
                  <div className="mt-3 space-y-2">
                    <h5 className="text-xs text-gray-400 font-medium">Recent Sightings</h5>
                    {huntSightings.slice(0, 5).map(s => (
                      <div key={s.id} className="flex items-center justify-between bg-slate-700/50 rounded px-3 py-2">
                        <div>
                          <span className="text-sm text-white">{s.venueName}</span>
                          <span className="text-xs text-gray-500 ml-2">({s.venueType})</span>
                          {s.venueAddress && <p className="text-xs text-gray-500">{s.venueAddress}</p>}
                        </div>
                        <div className="flex items-center gap-2 text-xs flex-shrink-0">
                          <span className="text-gray-500">{s.source}</span>
                          {s.alertSent && <span className="text-green-400">✓ alerted</span>}
                          <span className="text-gray-600">{s.detectedAt.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Add Beer Hunt Form
// ---------------------------------------------------------------------------
function AddBeerHuntForm({ onClose }: { onClose: () => void }) {
  const [beerName, setBeerName] = useState('');
  const [breweryName, setBreweryName] = useState('');
  const [style, setStyle] = useState('');
  const [searchArea, setSearchArea] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(15);
  const [sources, setSources] = useState<BeerHuntSource[]>(['untappd', 'beermenus', 'instagram']);
  const [alertWhatsApp, setAlertWhatsApp] = useState(true);
  const [whatsAppNumber, setWhatsAppNumber] = useState('');

  const toggleSource = (src: BeerHuntSource) => {
    setSources(prev => prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]);
  };

  const handleSubmit = () => {
    if (!beerName.trim() || !searchArea.trim()) return;
    beerMuleService.addHunt({
      beerName: beerName.trim(),
      breweryName: breweryName.trim() || undefined,
      style: style.trim() || undefined,
      searchArea: searchArea.trim(),
      radiusMiles,
      sources,
      alertWhatsApp,
      whatsAppNumber: whatsAppNumber.trim(),
      enabled: true,
    });
    onClose();
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-5 space-y-4">
      <h4 className="text-white font-semibold">Track a Beer at Local Venues</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Beer Name *</label>
          <input
            value={beerName}
            onChange={e => setBeerName(e.target.value)}
            placeholder="e.g. Pliny the Younger"
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Brewery (optional)</label>
          <input
            value={breweryName}
            onChange={e => setBreweryName(e.target.value)}
            placeholder="e.g. Russian River Brewing"
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Style (optional)</label>
          <input
            value={style}
            onChange={e => setStyle(e.target.value)}
            placeholder="e.g. Triple IPA, Stout"
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            <MapPin className="inline w-3.5 h-3.5 mr-1" />
            Search Area *
          </label>
          <input
            value={searchArea}
            onChange={e => setSearchArea(e.target.value)}
            placeholder="e.g. Hoboken NJ, Manhattan, 07030"
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Radius (miles)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={radiusMiles}
            onChange={e => setRadiusMiles(Number(e.target.value))}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Sources */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Scan Sources</label>
        <div className="flex gap-2 flex-wrap">
          {(['untappd', 'beermenus', 'instagram', 'manual'] as BeerHuntSource[]).map(src => (
            <button
              key={src}
              onClick={() => toggleSource(src)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                sources.includes(src) ? 'bg-amber-600 text-white' : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
              }`}
            >
              {src === 'untappd' ? 'Untappd' : src === 'beermenus' ? 'BeerMenus' : src === 'instagram' ? 'Instagram' : 'Manual'}
            </button>
          ))}
        </div>
      </div>

      {/* WhatsApp Alert */}
      <div className="bg-green-900/10 border border-green-700/30 rounded-lg p-3 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={alertWhatsApp} onChange={e => setAlertWhatsApp(e.target.checked)} className="accent-green-500 w-4 h-4" />
          <span className="text-sm text-white flex items-center gap-1">
            <MessageCircle className="w-4 h-4 text-green-400" />
            Send WhatsApp alert when beer is spotted
          </span>
        </label>
        {alertWhatsApp && (
          <div>
            <input
              value={whatsAppNumber}
              onChange={e => setWhatsAppNumber(e.target.value)}
              placeholder="WhatsApp number (leave empty to use default from Config)"
              className="w-full bg-slate-700 text-white rounded px-3 py-1.5 text-sm border border-slate-600 focus:border-green-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Alert message includes: beer name, venue name & type, address, and source link.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={!beerName.trim() || !searchArea.trim()}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Start Hunting
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
// Payment Methods Manager
// ---------------------------------------------------------------------------
function PaymentMethodsManager({ config, onSave }: { config: BeerMuleConfig; onSave: (patch: Partial<BeerMuleConfig>) => void }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [billingName, setBillingName] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const methods = config.paymentMethods || [];

  const addCard = () => {
    if (!cardNumber || !expMonth || !expYear || !billingName) return;
    const last4 = cardNumber.replace(/\s/g, '').slice(-4);
    const brand = cardNumber.startsWith('4') ? 'Visa' : cardNumber.startsWith('5') ? 'Mastercard' : cardNumber.startsWith('3') ? 'Amex' : 'Card';
    const newMethod: SavedPaymentMethod = {
      id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: label.trim() || `${brand} ••${last4}`,
      cardLast4: last4,
      cardBrand: brand,
      expMonth,
      expYear,
      billingName: billingName.trim(),
      billingZip: billingZip.trim(),
      isDefault: methods.length === 0,
    };
    onSave({ paymentMethods: [...methods, newMethod] });
    setAdding(false);
    setLabel(''); setCardNumber(''); setExpMonth(''); setExpYear(''); setBillingName(''); setBillingZip('');
  };

  const removeCard = (id: string) => {
    const updated = methods.filter(m => m.id !== id);
    if (updated.length > 0 && !updated.some(m => m.isDefault)) updated[0].isDefault = true;
    onSave({ paymentMethods: updated });
  };

  const setDefault = (id: string) => {
    onSave({ paymentMethods: methods.map(m => ({ ...m, isDefault: m.id === id })) });
  };

  return (
    <div className="space-y-3">
      {methods.length === 0 && !adding && (
        <p className="text-xs text-gray-500 italic">No payment methods saved. Add a card for auto-checkout.</p>
      )}
      {methods.map(m => (
        <div key={m.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-sm text-white font-medium">{m.cardBrand} ••••{m.cardLast4}</span>
              {m.label && m.label !== `${m.cardBrand} ••${m.cardLast4}` && (
                <span className="text-xs text-gray-400 ml-2">({m.label})</span>
              )}
              <p className="text-xs text-gray-500">{m.billingName} · Exp {m.expMonth}/{m.expYear} · ZIP {m.billingZip}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {m.isDefault ? (
              <span className="text-xs bg-green-800 text-green-300 px-2 py-0.5 rounded">Default</span>
            ) : (
              <button onClick={() => setDefault(m.id)} className="text-xs text-gray-400 hover:text-white">Set default</button>
            )}
            <button onClick={() => removeCard(m.id)} className="text-red-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={billingName} onChange={e => setBillingName(e.target.value)} placeholder="Name on card *"
              className="bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none col-span-2" />
            <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="Card number *" maxLength={19}
              className="bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none col-span-2" />
            <div className="flex gap-2">
              <input value={expMonth} onChange={e => setExpMonth(e.target.value)} placeholder="MM" maxLength={2}
                className="w-16 bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none" />
              <input value={expYear} onChange={e => setExpYear(e.target.value)} placeholder="YY" maxLength={2}
                className="w-16 bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none" />
            </div>
            <input value={billingZip} onChange={e => setBillingZip(e.target.value)} placeholder="Billing ZIP"
              className="bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none" />
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (optional, e.g. 'Beer card')"
              className="bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none col-span-2" />
          </div>
          <p className="text-xs text-gray-500">Card details are stored locally in your browser only. Never sent to any server. Used to auto-fill checkout forms.</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="text-xs text-gray-400 hover:text-white px-3 py-1.5">Cancel</button>
            <button onClick={addCard} disabled={!cardNumber || !expMonth || !expYear || !billingName}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 text-white rounded text-xs font-medium">Save Card</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300">
          <Plus className="w-3.5 h-3.5" /> Add Payment Method
        </button>
      )}
    </div>
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

        {/* Secure Payment */}
        <div>
          <h4 className="text-sm text-amber-400 font-semibold mb-3">Secure Payment</h4>
          <p className="text-xs text-gray-500 mb-3">
            Save a card for auto-checkout. Card details are stored locally in your browser only — never sent to any server.
            Beer Mule fills these at checkout when auto-purchasing.
          </p>
          <PaymentMethodsManager config={config} onSave={save} />
        </div>

        {/* WhatsApp Alerts */}
        <div>
          <h4 className="text-sm text-amber-400 font-semibold mb-3">WhatsApp Alerts (Beer Hunts)</h4>
          <label className="block text-xs text-gray-400 mb-1">Default WhatsApp Number for Alerts</label>
          <input
            value={config.alertWhatsAppNumber}
            onChange={e => save({ alertWhatsAppNumber: e.target.value })}
            placeholder="+1234567890"
            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            When a Beer Hunt spots a beer at a venue, an alert is sent to this WhatsApp number via your Twilio integration.
          </p>
        </div>

        <div>
          <h4 className="text-sm text-amber-400 font-semibold mb-3">Beer Hunt Scanning</h4>
          <label className="block text-xs text-gray-400 mb-1">Scan Interval (seconds)</label>
          <input
            type="number"
            min={60}
            max={3600}
            value={config.beerHuntPollIntervalSeconds}
            onChange={e => save({ beerHuntPollIntervalSeconds: Number(e.target.value) })}
            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none max-w-xs"
          />
          <p className="text-xs text-gray-500 mt-1">
            How often Beer Mule checks Untappd, BeerMenus, and Instagram for your tracked beers at local venues.
          </p>
        </div>

        {/* Apify Instagram Integration */}
        <div>
          <h4 className="text-sm text-amber-400 font-semibold mb-3">Instagram Monitoring (Apify)</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Apify API Token *</label>
              <input
                type="password"
                value={config.apifyApiToken}
                onChange={e => save({ apifyApiToken: e.target.value })}
                placeholder="apify_api_..."
                className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your token at <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline">apify.com → Settings → Integrations → API tokens</a>.
                Free tier gives ~30 runs/month.
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Apify Actor ID</label>
              <input
                value={config.apifyActorId}
                onChange={e => save({ apifyActorId: e.target.value })}
                placeholder="apify/instagram-post-scraper"
                className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: <code className="text-amber-400">apify/instagram-post-scraper</code>. Change only if using a different scraper actor.
              </p>
            </div>
          </div>
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
            <li>Beer Mule calls Apify to fetch the latest posts from each brewery's Instagram.</li>
            <li>Polls every {config.pollIntervalSeconds}s (faster at {config.fastPollIntervalSeconds}s during release windows).</li>
            <li>When a post matches release keywords, it extracts the ordering URL (e.g. Square link).</li>
            <li>Auto-checkout fills your saved details and payment card, places the order instantly.</li>
            <li>All activity is logged in the Activity tab; purchase results appear in Purchases.</li>
          </ol>
        </div>
      </div>
    </>
  );
}
