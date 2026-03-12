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

export type PaymentProvider = 'square' | 'shopify' | 'woocommerce' | 'bigcommerce' | 'other';

export interface CheckoutDetails {
  fullName: string;
  email: string;
  phone?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZip?: string;
}

export interface PaymentProviderConfig {
  provider: PaymentProvider;
  /** URL patterns the provider uses (auto-populated from provider, can be customized) */
  urlPatterns: string[];
  /** Your checkout details — name, email, address for the purchase (no seller account needed) */
  checkoutDetails?: CheckoutDetails;
  /** Whether the agent should attempt auto-checkout or just alert */
  autoCheckout: boolean;
}

/** Well-known URL patterns for each payment provider */
export const PAYMENT_PROVIDER_PATTERNS: Record<PaymentProvider, string[]> = {
  square: ['square.site', 'squareup.com', 'checkout.square.site'],
  shopify: ['myshopify.com', '.shopify.com'],
  woocommerce: ['woocommerce', '/product/', '/shop/'],
  bigcommerce: ['mybigcommerce.com', 'bigcommerce.com'],
  other: [],
};

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
  /** @deprecated Use paymentProvider instead for 'from_post' mode. */
  shopUrlPatterns: string[];
  /** Payment provider config for 'from_post' mode — agent uses provider's URL patterns to find the link */
  paymentProvider?: PaymentProviderConfig;
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

// ---------------------------------------------------------------------------
// Beer Hunt — track a beer by name at bars/restaurants in an area
// ---------------------------------------------------------------------------

export interface BeerHunt {
  id: string;
  beerName: string;
  /** Optional brewery name to narrow search */
  breweryName?: string;
  /** Style hint (e.g. "TIPA", "Stout") for fuzzy matching */
  style?: string;
  /** Geographic area to search (city, neighborhood, or zip) */
  searchArea: string;
  /** Radius in miles from search area center */
  radiusMiles: number;
  /** Sources to scan for this beer */
  sources: BeerHuntSource[];
  /** Send WhatsApp alert when found */
  alertWhatsApp: boolean;
  /** WhatsApp number to alert (uses default from config if empty) */
  whatsAppNumber: string;
  enabled: boolean;
  createdAt: Date;
}

export type BeerHuntSource = 'untappd' | 'beermenus' | 'instagram' | 'manual' | 'catalogbeer';

export interface BeerSighting {
  id: string;
  huntId: string;
  beerName: string;
  venueName: string;
  venueAddress?: string;
  venueType: 'bar' | 'restaurant' | 'pub' | 'bottle_shop' | 'other';
  source: BeerHuntSource;
  detectedAt: Date;
  alertSent: boolean;
  alertSentAt?: Date;
  /** URL to the source (e.g. Untappd check-in, BeerMenus page) */
  sourceUrl?: string;
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

export interface SavedPaymentMethod {
  id: string;
  label: string;
  cardLast4: string;
  cardBrand: string;
  expMonth: string;
  expYear: string;
  billingName: string;
  billingZip: string;
  isDefault: boolean;
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
  /** @deprecated Use apifyApiToken + apifyActorId instead */
  instagramProxyUrl: string;
  /** Apify API token (from apify.com → Settings → Integrations → API tokens) */
  apifyApiToken: string;
  /** Apify Actor ID for Instagram scraping (default: apify/instagram-post-scraper) */
  apifyActorId: string;
  /** Anthropic key re-use for smart post parsing */
  useAiParsing: boolean;
  /** Default WhatsApp number for Beer Hunt alerts (e.g. +1234567890) */
  alertWhatsAppNumber: string;
  /** Beer Hunt scanning interval in seconds (used when beerHuntScheduleMode === 'interval') */
  beerHuntPollIntervalSeconds: number;
  /** 'interval' = run every beerHuntPollIntervalSeconds; 'daily' = run once per day at beerHuntDailyTime */
  beerHuntScheduleMode: 'interval' | 'daily';
  /** When beerHuntScheduleMode === 'daily', run at this time (HH:mm, 24h) */
  beerHuntDailyTime: string;
  /** Saved payment methods for auto-checkout */
  paymentMethods: SavedPaymentMethod[];
  /** Only run monitoring on these days (0=Sun … 6=Sat). Empty = every day. */
  monitoringDays: number[];
  /** Start of daily window (HH:mm, 24h). Monitoring runs only between start and end. */
  monitoringStartTime: string;
  /** End of daily window (HH:mm, 24h). */
  monitoringEndTime: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: BeerMuleConfig = {
  pollIntervalSeconds: 15,
  fastPollIntervalSeconds: 5,
  releaseWindowMinutes: 30,
  autoPurchaseEnabled: false, // Troon flow: alert-only via webhook (email + WhatsApp); no auto-purchase
  instagramProxyUrl: '',
  apifyApiToken: '', // Optional: not used for Troon; webhook is the primary monitoring path
  apifyActorId: 'apify/instagram-post-scraper',
  useAiParsing: false,
  alertWhatsAppNumber: '',
  beerHuntPollIntervalSeconds: 300,
  beerHuntScheduleMode: 'interval',
  beerHuntDailyTime: '09:00',
  paymentMethods: [],
  monitoringDays: [],
  monitoringStartTime: '00:00',
  monitoringEndTime: '23:59',
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
  hunts: 'beer_mule_hunts',
  sightings: 'beer_mule_sightings',
  monitoringActive: 'beer_mule_monitoring_active',
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
  private hunts: BeerHunt[] = [];
  private sightings: BeerSighting[] = [];
  private config: BeerMuleConfig = { ...DEFAULT_CONFIG };
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private huntTimer: ReturnType<typeof setInterval> | null = null;
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
    this.hunts = loadJson<BeerHunt[]>(STORAGE_KEYS.hunts, []);
    this.sightings = loadJson<BeerSighting[]>(STORAGE_KEYS.sightings, []);
    this.config = { ...DEFAULT_CONFIG, ...loadJson<Partial<BeerMuleConfig>>(STORAGE_KEYS.config, {}) };
    if (localStorage.getItem(STORAGE_KEYS.monitoringActive) === 'true') {
      this.pollTimer = setInterval(() => this.tick(), this.config.pollIntervalSeconds * 1000);
      this.addEvent('system', 'poll', 'Monitoring restored (runs across tabs until you click Stop).');
    }
  }

  private persist(): void {
    saveJson(STORAGE_KEYS.breweries, this.breweries);
    saveJson(STORAGE_KEYS.beers, this.beers);
    saveJson(STORAGE_KEYS.purchases, this.purchases);
    saveJson(STORAGE_KEYS.events, this.events);
    saveJson(STORAGE_KEYS.hunts, this.hunts);
    saveJson(STORAGE_KEYS.sightings, this.sightings);
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
    localStorage.setItem(STORAGE_KEYS.monitoringActive, 'true');
    console.log('🍺 Beer Mule monitoring started (runs across tabs until Stop)');
    this.addEvent('system', 'poll', 'Monitoring started — runs on your schedule until you click Stop.');
    this.notify();

    this.pollTimer = setInterval(() => this.tick(), this.config.pollIntervalSeconds * 1000);
    this.tick();
  }

  stopMonitoring(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    localStorage.removeItem(STORAGE_KEYS.monitoringActive);
    console.log('🍺 Beer Mule monitoring stopped');
    this.addEvent('system', 'poll', 'Monitoring stopped');
    this.notify();
  }

  /** Single tick: only poll if within configured days and time window. */
  private tick(): void {
    if (!this.isWithinSchedule()) return;
    this.pollAllBreweries();
  }

  /** True if current day and time are inside config.monitoringDays and [monitoringStartTime, monitoringEndTime]. */
  private isWithinSchedule(): boolean {
    const days = this.config.monitoringDays;
    const startTime = this.config.monitoringStartTime ?? '00:00';
    const endTime = this.config.monitoringEndTime ?? '23:59';
    const now = new Date();
    const day = now.getDay();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    if (Array.isArray(days) && days.length > 0 && !days.includes(day)) return false;
    if (timeStr < startTime || timeStr > endTime) return false;
    return true;
  }

  private async pollAllBreweries(): Promise<void> {
    const active = this.breweries.filter(b => b.enabled);
    await this.pollWebhookQueue(active);
    this.notify();
  }

  /**
   * Poll the backend webhook queue for posts pushed by IFTTT/Zapier.
   * This is the primary monitoring method — instant, no scraping needed.
   */
  private async pollWebhookQueue(activeBreweries: Brewery[]): Promise<void> {
    try {
      const res = await fetch('/api/beermule/webhook/posts');
      if (!res.ok) return;
      const { posts } = await res.json() as { posts: Array<{ username?: string; caption?: string; url?: string }> };
      if (!posts || posts.length === 0) return;

      for (const post of posts) {
        const handle = (post.username || '').toLowerCase().replace(/^@/, '');
        const brewery = activeBreweries.find(b => b.instagramHandle.toLowerCase() === handle);
        if (!brewery) {
          this.addEvent('system', 'poll', `Webhook post from @${handle} — no matching brewery in watchlist`);
          continue;
        }

        const caption = post.caption || '';
        const postUrl = post.url || '';
        this.addEvent(brewery.id, 'release_detected',
          `🚨 WEBHOOK: New post from @${handle}: "${caption.substring(0, 120)}..."`,
          { postUrl });

        if (brewery.shopUrlMode === 'from_post') {
          const patterns = brewery.paymentProvider
            ? brewery.paymentProvider.urlPatterns
            : (brewery.shopUrlPatterns || []);
          const extracted = this.extractUrlsFromPost(caption, patterns);
          if (extracted.length > 0) {
            this.addEvent(brewery.id, 'release_detected',
              `🚨 WEBHOOK: Ordering URL found → ${extracted[0]}`,
              { postUrl, shopUrl: extracted[0] });
            if (this.config.autoPurchaseEnabled) {
              await this.attemptPurchase(brewery, caption, extracted[0]);
            }
          } else {
            this.addEvent(brewery.id, 'release_detected',
              `🚨 WEBHOOK: Post received but no ordering URL (${patterns.join('/')}) found in caption.`);
          }
        } else {
          if (this.config.autoPurchaseEnabled) {
            await this.attemptPurchase(brewery, caption, postUrl);
          }
        }
      }
    } catch {
      // Webhook endpoint not available — that's fine, Apify is the fallback
    }
  }

  /**
   * Extract URLs from post text. Looks for http/https links,
   * optionally filtered by the brewery's shopUrlPatterns.
   */
  extractUrlsFromPost(text: string, patterns: string[]): string[] {
    const fullUrlRegex = /https?:\/\/[^\s,)"'<>]+/gi;
    const fullUrls = text.match(fullUrlRegex) || [];

    const bareDomainUrls: string[] = [];
    for (const pattern of patterns) {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const bareRegex = new RegExp(`[a-z0-9][a-z0-9\\-]*\\.${escaped}[^\\s,)"'<>]*`, 'gi');
      const matches = text.match(bareRegex) || [];
      for (const m of matches) {
        if (!m.startsWith('http')) {
          bareDomainUrls.push(`https://${m}`);
        }
      }
    }

    const allUrls = [...fullUrls, ...bareDomainUrls];
    const unique = [...new Set(allUrls)];

    if (patterns.length === 0) return unique;
    return unique.filter(url => {
      const lower = url.toLowerCase();
      return patterns.some(p => lower.includes(p.toLowerCase()));
    });
  }

  /** Track post IDs we've already processed to avoid duplicates */
  private seenPostIds = new Set<string>();

  /** Build Apify actor input per actor: each has different input schema. */
  private buildApifyInput(instagramHandle: string, limit: number, actorIdOrSlug: string): Record<string, unknown> {
    const handle = instagramHandle.replace(/^@/, '');
    const profileUrl = `https://www.instagram.com/${handle}`;
    if (actorIdOrSlug.includes('scrapier/instagram-profile-post-scraper')) {
      return { startUrls: [profileUrl, handle], maxPosts: limit };
    }
    if (actorIdOrSlug.includes('apidojo/instagram-scraper-api')) {
      return { startUrls: [profileUrl], maxItems: limit };
    }
    if (actorIdOrSlug.includes('scraper-engine/instagram-post-scraper')) {
      return { startUrls: [profileUrl, handle], maxPosts: limit };
    }
    return {
      username: [handle],
      usernames: [handle],
      resultsLimit: limit,
    };
  }

  /** Turn Apify API error response into a short, actionable message (e.g. actor free trial expired). */
  private apifyErrorMessage(status: number, errText: string): string {
    if (status === 403 && /actor-is-not-rented|free trial has expired/i.test(errText)) {
      return (
        'This Apify Actor\'s free trial has expired. For Troon: use webhook-only — clear the Apify API token in Config to stop these errors (alerts will still work via the webhook). Or switch Actor ID to apify/instagram-post-scraper for free tier.'
      );
    }
    if (status === 403) {
      return `Apify 403 Forbidden: ${errText.substring(0, 120)}`;
    }
    return `Apify HTTP ${status}: ${errText.substring(0, 200)}`;
  }

  /**
   * Poll a single brewery's Instagram feed via Apify.
   * Calls the Apify Instagram scraper actor synchronously, gets recent posts,
   * scans for release keywords, extracts ordering URLs, and triggers purchase.
   */
  private async pollBrewery(brewery: Brewery): Promise<void> {
    const allKeywords = [...DEFAULT_RELEASE_KEYWORDS, ...brewery.keywords];

    if (!this.config.apifyApiToken) {
      this.addEvent(brewery.id, 'poll', `Polled @${brewery.instagramHandle} — add your Apify API token in Config to enable live monitoring`);
      return;
    }

    const rawActorId = this.config.apifyActorId || 'apify/instagram-post-scraper';
    const actorId = rawActorId.replace('/', '~');

    try {
      const apiUrl = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(this.config.apifyApiToken)}&format=json`;
      const input = this.buildApifyInput(brewery.instagramHandle, 15, rawActorId);
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(this.apifyErrorMessage(res.status, errText));
      }

      const rawResults: Array<Record<string, unknown>> = await res.json();
      const posts: Array<Record<string, unknown>> = [];
      for (const r of rawResults) {
        if (Array.isArray(r.latestPosts) && (r.latestPosts as unknown[]).length > 0) {
          posts.push(...(r.latestPosts as Array<Record<string, unknown>>));
        } else if (Array.isArray(r.posts) && (r.posts as unknown[]).length > 0) {
          posts.push(...(r.posts as Array<Record<string, unknown>>));
        } else if (Array.isArray(r.items) && (r.items as unknown[]).length > 0) {
          posts.push(...(r.items as Array<Record<string, unknown>>));
        } else if (r.caption || r.text) {
          posts.push(r);
        }
      }
      this.addEvent(brewery.id, 'poll', `Fetched ${posts.length} posts from @${brewery.instagramHandle} via Apify`);

      for (const item of posts) {
        const postId = String(item.id || item.shortCode || item.url || '');
        if (postId && this.seenPostIds.has(postId)) continue;
        if (postId) this.seenPostIds.add(postId);

        const caption = String(item.caption || item.text || item.alt || '');
        if (!caption) continue;

        const lowerText = caption.toLowerCase();
        const isRelease = allKeywords.some(kw => lowerText.includes(kw.toLowerCase()));
        if (!isRelease) continue;

        const postUrl = String(item.url || item.displayUrl || `https://instagram.com/p/${item.shortCode || postId}`);
        let shopUrl = postUrl;

        if (brewery.shopUrlMode === 'from_post') {
          const patterns = brewery.paymentProvider
            ? brewery.paymentProvider.urlPatterns
            : (brewery.shopUrlPatterns || []);
          const extracted = this.extractUrlsFromPost(caption, patterns);
          if (extracted.length > 0) {
            shopUrl = extracted[0];
            this.addEvent(brewery.id, 'release_detected',
              `🚨 RELEASE from @${brewery.instagramHandle}! Ordering URL: ${shopUrl}`,
              { postUrl, shopUrl, caption: caption.substring(0, 200) });
          } else {
            this.addEvent(brewery.id, 'release_detected',
              `🚨 Release from @${brewery.instagramHandle} but no ordering URL in post. Caption: "${caption.substring(0, 120)}..."`,
              { postUrl });
            continue;
          }
        } else {
          this.addEvent(brewery.id, 'release_detected',
            `🚨 Release from @${brewery.instagramHandle}: "${caption.substring(0, 100)}..."`,
            { postUrl });
        }

        if (this.config.autoPurchaseEnabled) {
          await this.attemptPurchase(brewery, caption, shopUrl);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.addEvent(brewery.id, 'error', `Apify poll failed for @${brewery.instagramHandle}: ${msg}`);
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

  // --- Beer Hunts ---

  getHunts(): BeerHunt[] {
    return [...this.hunts];
  }

  addHunt(data: Omit<BeerHunt, 'id' | 'createdAt'>): BeerHunt {
    const hunt: BeerHunt = {
      ...data,
      id: `hunt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date(),
    };
    this.hunts.push(hunt);
    this.addEvent('system', 'poll', `🍺 Beer Hunt added: "${hunt.beerName}" in ${hunt.searchArea} (${hunt.radiusMiles}mi radius)`);
    this.notify();
    return hunt;
  }

  updateHunt(id: string, patch: Partial<Omit<BeerHunt, 'id' | 'createdAt'>>): void {
    this.hunts = this.hunts.map(h => (h.id === id ? { ...h, ...patch } : h));
    this.notify();
  }

  removeHunt(id: string): void {
    this.hunts = this.hunts.filter(h => h.id !== id);
    this.sightings = this.sightings.filter(s => s.huntId !== id);
    this.notify();
  }

  getSightings(huntId?: string): BeerSighting[] {
    const all = [...this.sightings].sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
    return huntId ? all.filter(s => s.huntId === huntId) : all;
  }

  simulateSighting(huntId: string): void {
    const hunt = this.hunts.find(h => h.id === huntId);
    if (!hunt) return;

    const venues = [
      { name: 'The Craft House', type: 'bar' as const, addr: '123 Main St' },
      { name: 'Hop Culture Taproom', type: 'pub' as const, addr: '456 Oak Ave' },
      { name: 'Barrel & Spoke', type: 'restaurant' as const, addr: '789 Elm Blvd' },
      { name: 'Local Bottle Shop', type: 'bottle_shop' as const, addr: '321 Pine Rd' },
      { name: 'The Growler Fill', type: 'bar' as const, addr: '654 Maple Dr' },
    ];
    const venue = venues[Math.floor(Math.random() * venues.length)];
    const sources: BeerHuntSource[] = ['untappd', 'beermenus', 'instagram'];
    const source = sources[Math.floor(Math.random() * sources.length)];

    const sighting: BeerSighting = {
      id: `sight-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      huntId: hunt.id,
      beerName: hunt.beerName,
      venueName: venue.name,
      venueAddress: `${venue.addr}, ${hunt.searchArea}`,
      venueType: venue.type,
      source,
      detectedAt: new Date(),
      alertSent: hunt.alertWhatsApp,
      alertSentAt: hunt.alertWhatsApp ? new Date() : undefined,
    };
    this.sightings.push(sighting);

    const alertNote = hunt.alertWhatsApp
      ? ` — WhatsApp alert sent to ${hunt.whatsAppNumber || this.config.alertWhatsAppNumber || 'default number'}`
      : '';
    this.addEvent('system', 'release_detected',
      `🍺 SIMULATED sighting: "${hunt.beerName}" spotted at ${venue.name} (${venue.type}) in ${hunt.searchArea} via ${source}${alertNote}`);
    this.notify();
  }

  /** Send a fake post to the backend webhook to test email + WhatsApp alerts (Troon webhook-only flow). */
  private async testWebhookAlert(brewery: Brewery): Promise<void> {
    const handle = brewery.instagramHandle.replace(/^@/, '');
    const fakeCaption = `Test post from Beer Mule — order here: https://square.site/test-store-123 (this is a test; check your email and WhatsApp).`;
    const body = {
      username: handle,
      caption: fakeCaption,
      url: 'https://instagram.com/p/test',
      timestamp: new Date().toISOString(),
    };
    try {
      this.addEvent(brewery.id, 'poll', `🧪 TEST: Sending test post to webhook (no Apify) — check email and WhatsApp for alert.`);
      this.notify();
      const res = await fetch('/api/beermule/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.alerted) {
        this.addEvent(brewery.id, 'release_detected', `🧪 TEST: Webhook alert sent. Check your email and WhatsApp.`);
      } else if (res.ok && !data.alerted) {
        this.addEvent(brewery.id, 'poll', `🧪 TEST: Webhook accepted but no alert sent (backend may not have URL in watched list).`);
      } else {
        this.addEvent(brewery.id, 'error', `🧪 TEST: Webhook returned ${res.status} — ${data.error || res.statusText}. Is the backend running and /api proxied?`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.addEvent(brewery.id, 'error', `🧪 TEST: Webhook request failed — ${msg}. Is the backend running?`);
    }
    this.notify();
  }

  // --- Test: send fake post to webhook (email + WhatsApp alert) ---

  async testRealPosts(breweryId: string): Promise<void> {
    const brewery = this.breweries.find(b => b.id === breweryId);
    if (!brewery) return;
    await this.testWebhookAlert(brewery);
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
      const provider = brewery.paymentProvider?.provider || 'square';
      const domain = provider === 'square' ? 'square.site'
        : provider === 'shopify' ? 'myshopify.com'
        : 'checkout.example.com';
      const fakeId = Math.random().toString(36).slice(2, 10);
      const fakePostUrl = `https://${brewery.instagramHandle.replace(/[^a-z0-9]/g, '')}.${domain}/${fakeId}`;
      const autoCheckout = brewery.paymentProvider?.autoCheckout ? ' → auto-checkout ENABLED' : ' → alert only';
      const buyerName = brewery.paymentProvider?.checkoutDetails?.fullName;
      const acctInfo = buyerName ? ` (buyer: ${buyerName})` : '';
      this.addEvent(brewery.id, 'release_detected',
        `🚨 SIMULATED release from @${brewery.instagramHandle}: "${beerName}" — ${provider.toUpperCase()} URL extracted: ${fakePostUrl}${autoCheckout}${acctInfo}`);

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
