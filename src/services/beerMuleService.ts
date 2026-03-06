/**
 * Beer Mule Service
 * 
 * Monitors brewery social media (Instagram, etc.) for limited beer releases,
 * and automatically purchases them the instant they go live.
 * 
 * Key design:
 * - Polls configured sources at a fast cadence (configurable, default 15s)
 * - Detects new release announcements via keyword matching on post text
 * - Immediately triggers the auto-purchase flow on the brewery's shop
 * - Respects per-brewery max-quantity rules
 * - Persists all config & history to localStorage
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Brewery {
  id: string;
  name: string;
  instagramHandle: string;
  shopUrl: string;
  /** Days the brewery typically releases (0=Sun … 6=Sat) */
  releaseDays: number[];
  /** Optional release window, e.g. "12:00" (24h). Agent polls faster inside window. */
  releaseTimeHint?: string;
  maxQuantity: number;
  enabled: boolean;
  /** Extra keywords that signal a release post (merged with defaults). */
  keywords: string[];
  createdAt: Date;
}

export interface TrackedBeer {
  id: string;
  breweryId: string;
  name: string;
  style?: string;
  /** If set, only auto-buy when this specific beer appears. Otherwise buy any release. */
  autoBuy: boolean;
  maxQuantity?: number;
}

export type OrderStatus = 'pending' | 'purchasing' | 'success' | 'failed' | 'sold_out';

export interface PurchaseAttempt {
  id: string;
  breweryId: string;
  breweryName: string;
  beerName: string;
  detectedAt: Date;
  attemptedAt: Date;
  completedAt?: Date;
  status: OrderStatus;
  quantity: number;
  totalPrice?: number;
  errorMessage?: string;
  sourcePostUrl?: string;
}

export interface MonitorEvent {
  id: string;
  breweryId: string;
  type: 'poll' | 'release_detected' | 'purchase_started' | 'purchase_success' | 'purchase_failed' | 'error';
  message: string;
  timestamp: Date;
  meta?: Record<string, unknown>;
}

export interface BeerMuleConfig {
  /** Global polling interval in seconds */
  pollIntervalSeconds: number;
  /** Faster cadence during the release window (seconds) */
  fastPollIntervalSeconds: number;
  /** Minutes before/after releaseTimeHint to use fast cadence */
  releaseWindowMinutes: number;
  /** Auto-purchase enabled globally */
  autoPurchaseEnabled: boolean;
  /** Instagram API proxy / scraper endpoint (user-provided) */
  instagramProxyUrl: string;
  /** Anthropic key re-use for smart post parsing */
  useAiParsing: boolean;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: BeerMuleConfig = {
  pollIntervalSeconds: 15,
  fastPollIntervalSeconds: 5,
  releaseWindowMinutes: 30,
  autoPurchaseEnabled: true,
  instagramProxyUrl: '',
  useAiParsing: false,
};

const DEFAULT_RELEASE_KEYWORDS = [
  'available now',
  'on sale now',
  'live now',
  'just dropped',
  'now available',
  'released',
  'release day',
  'beer drop',
  'fresh drop',
  'cans available',
  'bottles available',
  'order now',
  'shop link in bio',
  'link in bio',
  'pre-order',
  'preorder',
  'going live',
  'store is open',
  'store is live',
];

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  breweries: 'beer_mule_breweries',
  beers: 'beer_mule_beers',
  purchases: 'beer_mule_purchases',
  events: 'beer_mule_events',
  config: 'beer_mule_config',
} as const;

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw, (k, v) => {
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v);
      return v;
    });
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

class BeerMuleService {
  private breweries: Brewery[] = [];
  private beers: TrackedBeer[] = [];
  private purchases: PurchaseAttempt[] = [];
  private events: MonitorEvent[] = [];
  private config: BeerMuleConfig = { ...DEFAULT_CONFIG };
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.load();
  }

  // --- Persistence ---

  private load(): void {
    this.breweries = loadJson<Brewery[]>(STORAGE_KEYS.breweries, []);
    this.beers = loadJson<TrackedBeer[]>(STORAGE_KEYS.beers, []);
    this.purchases = loadJson<PurchaseAttempt[]>(STORAGE_KEYS.purchases, []);
    this.events = loadJson<MonitorEvent[]>(STORAGE_KEYS.events, []);
    this.config = { ...DEFAULT_CONFIG, ...loadJson<Partial<BeerMuleConfig>>(STORAGE_KEYS.config, {}) };
  }

  private persist(): void {
    saveJson(STORAGE_KEYS.breweries, this.breweries);
    saveJson(STORAGE_KEYS.beers, this.beers);
    saveJson(STORAGE_KEYS.purchases, this.purchases);
    saveJson(STORAGE_KEYS.events, this.events);
    saveJson(STORAGE_KEYS.config, this.config);
  }

  // --- Change listeners (for React re-renders) ---

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.persist();
    this.listeners.forEach(l => l());
  }

  // --- Config ---

  getConfig(): BeerMuleConfig {
    return { ...this.config };
  }

  updateConfig(patch: Partial<BeerMuleConfig>): void {
    this.config = { ...this.config, ...patch };
    this.notify();
  }

  // --- Breweries ---

  getBreweries(): Brewery[] {
    return [...this.breweries];
  }

  addBrewery(data: Omit<Brewery, 'id' | 'createdAt'>): Brewery {
    const brewery: Brewery = {
      ...data,
      id: `brewery-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date(),
    };
    this.breweries.push(brewery);
    this.addEvent(brewery.id, 'poll', `Brewery "${brewery.name}" added to watchlist`);
    this.notify();
    return brewery;
  }

  updateBrewery(id: string, patch: Partial<Omit<Brewery, 'id' | 'createdAt'>>): void {
    this.breweries = this.breweries.map(b => (b.id === id ? { ...b, ...patch } : b));
    this.notify();
  }

  removeBrewery(id: string): void {
    this.breweries = this.breweries.filter(b => b.id !== id);
    this.beers = this.beers.filter(b => b.breweryId !== id);
    this.notify();
  }

  // --- Tracked Beers ---

  getBeers(): TrackedBeer[] {
    return [...this.beers];
  }

  getBeersForBrewery(breweryId: string): TrackedBeer[] {
    return this.beers.filter(b => b.breweryId === breweryId);
  }

  addBeer(data: Omit<TrackedBeer, 'id'>): TrackedBeer {
    const beer: TrackedBeer = {
      ...data,
      id: `beer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    this.beers.push(beer);
    this.notify();
    return beer;
  }

  updateBeer(id: string, patch: Partial<Omit<TrackedBeer, 'id'>>): void {
    this.beers = this.beers.map(b => (b.id === id ? { ...b, ...patch } : b));
    this.notify();
  }

  removeBeer(id: string): void {
    this.beers = this.beers.filter(b => b.id !== id);
    this.notify();
  }

  // --- Purchases ---

  getPurchases(): PurchaseAttempt[] {
    return [...this.purchases].sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  // --- Events ---

  getEvents(limit = 50): MonitorEvent[] {
    return [...this.events].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }

  private addEvent(breweryId: string, type: MonitorEvent['type'], message: string, meta?: Record<string, unknown>): void {
    this.events.push({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      breweryId,
      type,
      message,
      timestamp: new Date(),
      meta,
    });
    if (this.events.length > 500) {
      this.events = this.events.slice(-500);
    }
  }

  // --- Monitoring engine ---

  isMonitoring(): boolean {
    return this.pollTimer !== null;
  }

  startMonitoring(): void {
    if (this.pollTimer) return;
    console.log('🍺 Beer Mule monitoring started');
    this.addEvent('system', 'poll', 'Monitoring started');
    this.notify();

    this.pollTimer = setInterval(() => {
      this.pollAllBreweries();
    }, this.config.pollIntervalSeconds * 1000);

    this.pollAllBreweries();
  }

  stopMonitoring(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    console.log('🍺 Beer Mule monitoring stopped');
    this.addEvent('system', 'poll', 'Monitoring stopped');
    this.notify();
  }

  private async pollAllBreweries(): Promise<void> {
    const active = this.breweries.filter(b => b.enabled);
    for (const brewery of active) {
      try {
        await this.pollBrewery(brewery);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.addEvent(brewery.id, 'error', `Poll error for ${brewery.name}: ${msg}`);
      }
    }
    this.notify();
  }

  /**
   * Poll a single brewery's Instagram feed for new release posts.
   * 
   * In production this would hit an Instagram scraper / proxy API.
   * For now we simulate the detection pipeline so the full UI and
   * purchase flow can be demonstrated and tested end-to-end.
   */
  private async pollBrewery(brewery: Brewery): Promise<void> {
    const allKeywords = [...DEFAULT_RELEASE_KEYWORDS, ...brewery.keywords];

    if (!this.config.instagramProxyUrl) {
      this.addEvent(brewery.id, 'poll', `Polled @${brewery.instagramHandle} — waiting for Instagram proxy URL to enable live monitoring`);
      return;
    }

    try {
      const res = await fetch(`${this.config.instagramProxyUrl}/api/instagram/${brewery.instagramHandle}/recent`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const posts: Array<{ id: string; text: string; timestamp: string; url: string }> = await res.json();

      for (const post of posts) {
        const lowerText = post.text.toLowerCase();
        const isRelease = allKeywords.some(kw => lowerText.includes(kw.toLowerCase()));
        if (isRelease) {
          this.addEvent(brewery.id, 'release_detected', `🚨 Release detected from @${brewery.instagramHandle}: "${post.text.substring(0, 100)}..."`, { postUrl: post.url });
          if (this.config.autoPurchaseEnabled) {
            await this.attemptPurchase(brewery, post.text, post.url);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.addEvent(brewery.id, 'error', `Failed to fetch posts for @${brewery.instagramHandle}: ${msg}`);
    }
  }

  /**
   * Attempt auto-purchase on the brewery's shop.
   * 
   * In production this would use Puppeteer/Playwright via a backend
   * microservice to navigate the shop, add items to cart, and checkout.
   */
  private async attemptPurchase(brewery: Brewery, postText: string, postUrl: string): Promise<void> {
    const beerName = this.extractBeerName(postText, brewery);
    const quantity = this.determineQuantity(brewery, beerName);

    const attempt: PurchaseAttempt = {
      id: `purchase-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      breweryId: brewery.id,
      breweryName: brewery.name,
      beerName,
      detectedAt: new Date(),
      attemptedAt: new Date(),
      status: 'purchasing',
      quantity,
      sourcePostUrl: postUrl,
    };
    this.purchases.push(attempt);
    this.addEvent(brewery.id, 'purchase_started', `🛒 Auto-purchasing ${quantity}x "${beerName}" from ${brewery.name}…`);
    this.notify();

    try {
      // In a real implementation, call the purchase backend here:
      // const result = await fetch('/api/beer-mule/purchase', { ... });
      // For now, record as pending (requires backend integration).
      attempt.status = 'pending';
      attempt.errorMessage = 'Backend purchase service not yet connected — configure shop automation endpoint in settings.';
      this.addEvent(brewery.id, 'purchase_failed', `Purchase for "${beerName}" is pending — connect the purchase backend to complete.`);
    } catch (err) {
      attempt.status = 'failed';
      attempt.errorMessage = err instanceof Error ? err.message : String(err);
      attempt.completedAt = new Date();
      this.addEvent(brewery.id, 'purchase_failed', `❌ Purchase failed for "${beerName}": ${attempt.errorMessage}`);
    }

    this.notify();
  }

  private extractBeerName(postText: string, brewery: Brewery): string {
    const trackedBeers = this.beers.filter(b => b.breweryId === brewery.id);
    for (const beer of trackedBeers) {
      if (postText.toLowerCase().includes(beer.name.toLowerCase())) {
        return beer.name;
      }
    }
    const firstLine = postText.split('\n')[0]?.trim() || '';
    return firstLine.substring(0, 80) || `${brewery.name} Release`;
  }

  private determineQuantity(brewery: Brewery, beerName: string): number {
    const specificBeer = this.beers.find(
      b => b.breweryId === brewery.id && b.name.toLowerCase() === beerName.toLowerCase()
    );
    if (specificBeer?.maxQuantity) return specificBeer.maxQuantity;
    return brewery.maxQuantity || 1;
  }

  // --- Simulate a release (for demo/testing) ---

  simulateRelease(breweryId: string): void {
    const brewery = this.breweries.find(b => b.id === breweryId);
    if (!brewery) return;

    const sampleBeers = [
      'Hazy Double IPA — "Cloud Walker"',
      'Imperial Stout — "Midnight Protocol"',
      'Fruited Sour — "Passionfruit Cascade"',
      'West Coast IPA — "Coastal Fog"',
      'Pale Ale — "Sunlit Path"',
    ];
    const beerName = sampleBeers[Math.floor(Math.random() * sampleBeers.length)];
    const qty = brewery.maxQuantity || 2;

    this.addEvent(brewery.id, 'release_detected', `🚨 SIMULATED release from @${brewery.instagramHandle}: "${beerName}" — available now!`);

    const attempt: PurchaseAttempt = {
      id: `purchase-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      breweryId: brewery.id,
      breweryName: brewery.name,
      beerName,
      detectedAt: new Date(),
      attemptedAt: new Date(),
      completedAt: new Date(),
      status: 'success',
      quantity: qty,
      totalPrice: +(Math.random() * 40 + 15).toFixed(2),
      sourcePostUrl: `https://instagram.com/p/simulated-${Date.now()}`,
    };
    this.purchases.push(attempt);
    this.addEvent(brewery.id, 'purchase_success', `✅ SIMULATED purchase: ${qty}x "${beerName}" from ${brewery.name} — $${attempt.totalPrice}`);
    this.notify();
  }
}

export const beerMuleService = new BeerMuleService();
