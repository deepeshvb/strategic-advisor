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

export interface ShopUrlEntry {
  url: string;
  label: string;
  /** Days this shop URL is active (0=Sun … 6=Sat). Empty = every day. */
  activeDays: number[];
}

export type ShopUrlMode = 'fixed' | 'from_post';

export interface Brewery {
  id: string;
  name: string;
  instagramHandle: string;
  /** @deprecated Use shopUrls instead. Kept for backward compat. */
  shopUrl: string;
  /** Multiple shop URLs, each with a label and active days (e.g. weekday vs weekend site). */
  shopUrls: ShopUrlEntry[];
  /**
   * How to determine the shop URL:
   * - 'fixed': use pre-configured shopUrls (e.g. brewery has a permanent online shop)
   * - 'from_post': extract the ordering URL from the Instagram post itself
   *   (e.g. Troon publishes a unique Square link in each release post)
   */
  shopUrlMode: ShopUrlMode;
  /** URL pattern hints for extracting links from posts (e.g. 'square.site', 'squareup.com'). */
  shopUrlPatterns: string[];
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
   * Extract URLs from post text. Looks for http/https links,
   * optionally filtered by the brewery's shopUrlPatterns.
   */
  extractUrlsFromPost(text: string, patterns: string[]): string[] {
    const urlRegex = /https?:\/\/[^\s,)"'<>]+/gi;
    const allUrls = text.match(urlRegex) || [];
    if (patterns.length === 0) return allUrls;
    return allUrls.filter(url => {
      const lower = url.toLowerCase();
      return patterns.some(p => lower.includes(p.toLowerCase()));
    });
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
          let shopUrl = post.url;

          if (brewery.shopUrlMode === 'from_post') {
            const extracted = this.extractUrlsFromPost(post.text, brewery.shopUrlPatterns || []);
            if (extracted.length > 0) {
              shopUrl = extracted[0];
              this.addEvent(brewery.id, 'release_detected',
                `🚨 Release detected from @${brewery.instagramHandle}! Ordering URL found in post: ${shopUrl}`,
                { postUrl: post.url, shopUrl });
            } else {
              this.addEvent(brewery.id, 'release_detected',
                `🚨 Release detected from @${brewery.instagramHandle} but no ordering URL found in post text. Post: "${post.text.substring(0, 120)}..."`,
                { postUrl: post.url });
            }
          } else {
            this.addEvent(brewery.id, 'release_detected',
              `🚨 Release detected from @${brewery.instagramHandle}: "${post.text.substring(0, 100)}..."`,
              { postUrl: post.url });
          }

          if (this.config.autoPurchaseEnabled) {
            await this.attemptPurchase(brewery, post.text, shopUrl);
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
  /**
   * Resolve the correct shop URL for the current day of week.
   * If shopUrls has entries, pick the one whose activeDays includes today (or first with empty activeDays).
   * Falls back to the legacy shopUrl field.
   */
  getActiveShopUrl(brewery: Brewery): { url: string; label: string } | null {
    const today = new Date().getDay();
    if (brewery.shopUrls && brewery.shopUrls.length > 0) {
      const match = brewery.shopUrls.find(s => s.activeDays.length === 0 || s.activeDays.includes(today));
      if (match) return { url: match.url, label: match.label };
      return { url: brewery.shopUrls[0].url, label: brewery.shopUrls[0].label };
    }
    if (brewery.shopUrl) return { url: brewery.shopUrl, label: 'Shop' };
    return null;
  }

  private async attemptPurchase(brewery: Brewery, postText: string, postUrl: string): Promise<void> {
    const beerName = this.extractBeerName(postText, brewery);
    const quantity = this.determineQuantity(brewery, beerName);
    const shop = this.getActiveShopUrl(brewery);

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
    const shopLabel = shop ? ` via ${shop.label} (${shop.url})` : '';
    this.addEvent(brewery.id, 'purchase_started', `🛒 Auto-purchasing ${quantity}x "${beerName}" from ${brewery.name}${shopLabel}…`);
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

    if (brewery.shopUrlMode === 'from_post') {
      const fakeSquareId = Math.random().toString(36).slice(2, 10);
      const fakePostUrl = `https://${brewery.instagramHandle.replace(/[^a-z0-9]/g, '')}.square.site/${fakeSquareId}`;
      this.addEvent(brewery.id, 'release_detected',
        `🚨 SIMULATED release from @${brewery.instagramHandle}: "${beerName}" — ordering URL extracted from post: ${fakePostUrl}`);

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
        sourcePostUrl: fakePostUrl,
      };
      this.purchases.push(attempt);
      this.addEvent(brewery.id, 'purchase_success',
        `✅ SIMULATED purchase: ${qty}x "${beerName}" from ${brewery.name} via post URL ${fakePostUrl} — $${attempt.totalPrice}`);
      this.notify();
      return;
    }

    const shop = this.getActiveShopUrl(brewery);
    const shopInfo = shop ? ` | Shop: ${shop.label} (${shop.url})` : '';

    this.addEvent(brewery.id, 'release_detected', `🚨 SIMULATED release from @${brewery.instagramHandle}: "${beerName}" — available now!${shopInfo}`);

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
