/**
 * Card image and URL cache for print sessions with LRU Eviction.
 *
 * Prevents:
 * - Re-downloading student photos during Preview → Print → PDF
 * - Re-generating Supabase signed URLs on every React render
 * - Re-rendering card canvases for unchanged cards
 * - Memory leaks via bounded LRU (Least Recently Used) eviction
 */

const MAX_IMAGE_CACHE_SIZE = 500;
const MAX_URL_CACHE_SIZE = 1000;

export class CardImageCache {
  private imageCache = new Map<string, string>();
  private urlCache = new Map<string, { url: string; cachedAt: number }>();
  private maxImageSize: number;
  private maxUrlSize: number;

  constructor(maxImageSize = MAX_IMAGE_CACHE_SIZE, maxUrlSize = MAX_URL_CACHE_SIZE) {
    this.maxImageSize = maxImageSize;
    this.maxUrlSize = maxUrlSize;
  }

  /** Cache key for a rendered card face. */
  static cardKey(personId: string, side: 'front' | 'back', templateVersion?: string): string {
    return templateVersion ? `${personId}:${side}:${templateVersion}` : `${personId}:${side}`;
  }

  /**
   * Get a rendered card image (data URL) from cache, or render it and store.
   * `renderFn` is only called on cache miss.
   */
  async getOrRenderCard(
    personId: string,
    side: 'front' | 'back',
    renderFn: () => Promise<string>,
    templateVersion?: string,
  ): Promise<string> {
    const key = CardImageCache.cardKey(personId, side, templateVersion);
    const cached = this.imageCache.get(key);
    if (cached) {
      // LRU refresh: re-insert to mark as recently used
      this.imageCache.delete(key);
      this.imageCache.set(key, cached);
      return cached;
    }

    const dataUrl = await renderFn();
    this.setCard(personId, side, dataUrl, templateVersion);
    return dataUrl;
  }

  /** Check if a card image is already cached. */
  hasCard(personId: string, side: 'front' | 'back', templateVersion?: string): boolean {
    return this.imageCache.has(CardImageCache.cardKey(personId, side, templateVersion));
  }

  /** Get a cached card image without rendering. */
  getCard(personId: string, side: 'front' | 'back', templateVersion?: string): string | undefined {
    const key = CardImageCache.cardKey(personId, side, templateVersion);
    const item = this.imageCache.get(key);
    if (item) {
      // LRU refresh
      this.imageCache.delete(key);
      this.imageCache.set(key, item);
    }
    return item;
  }

  /** Store a card image in cache with LRU eviction. */
  setCard(personId: string, side: 'front' | 'back', dataUrl: string, templateVersion?: string): void {
    const key = CardImageCache.cardKey(personId, side, templateVersion);
    if (this.imageCache.has(key)) {
      this.imageCache.delete(key);
    } else if (this.imageCache.size >= this.maxImageSize) {
      // Evict least recently used (first element in Map iteration order)
      const oldestKey = this.imageCache.keys().next().value;
      if (oldestKey) this.imageCache.delete(oldestKey);
    }
    this.imageCache.set(key, dataUrl);
  }

  /**
   * Get a signed URL from cache, or fetch it and store with 45-min TTL.
   * `fetchFn` is only called on cache miss or expired TTL.
   */
  async getOrFetchUrl(
    storagePath: string,
    fetchFn: () => Promise<string>,
  ): Promise<string> {
    const entry = this.urlCache.get(storagePath);
    const now = Date.now();
    // Signed URLs usually expire after 60 min. Re-fetch after 45 min.
    if (entry && now - entry.cachedAt < 45 * 60 * 1000) {
      // LRU refresh
      this.urlCache.delete(storagePath);
      this.urlCache.set(storagePath, entry);
      return entry.url;
    }

    const url = await fetchFn();
    if (this.urlCache.has(storagePath)) {
      this.urlCache.delete(storagePath);
    } else if (this.urlCache.size >= this.maxUrlSize) {
      const oldestKey = this.urlCache.keys().next().value;
      if (oldestKey) this.urlCache.delete(oldestKey);
    }
    this.urlCache.set(storagePath, { url, cachedAt: now });
    return url;
  }

  /** Number of cached items. */
  get size(): number {
    return this.imageCache.size + this.urlCache.size;
  }

  /** Clear all cached data (call when leaving print context). */
  clear(): void {
    this.imageCache.clear();
    this.urlCache.clear();
  }
}
