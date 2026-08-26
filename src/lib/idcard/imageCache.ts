/**
 * Card image and URL cache for print sessions.
 *
 * Prevents:
 * - Re-downloading student photos during Preview → Print → PDF
 * - Re-generating Supabase signed URLs on every React render
 * - Re-rendering card canvases for unchanged cards
 */

export class CardImageCache {
  private imageCache = new Map<string, string>()
  private urlCache = new Map<string, string>()

  /** Cache key for a rendered card face. */
  static cardKey(personId: string, side: 'front' | 'back'): string {
    return `${personId}:${side}`
  }

  /**
   * Get a rendered card image (data URL) from cache, or render it and store.
   * `renderFn` is only called on cache miss.
   */
  async getOrRenderCard(
    personId: string,
    side: 'front' | 'back',
    renderFn: () => Promise<string>,
  ): Promise<string> {
    const key = CardImageCache.cardKey(personId, side)
    const cached = this.imageCache.get(key)
    if (cached) return cached

    const dataUrl = await renderFn()
    this.imageCache.set(key, dataUrl)
    return dataUrl
  }

  /** Check if a card image is already cached. */
  hasCard(personId: string, side: 'front' | 'back'): boolean {
    return this.imageCache.has(CardImageCache.cardKey(personId, side))
  }

  /** Get a cached card image without rendering. */
  getCard(personId: string, side: 'front' | 'back'): string | undefined {
    return this.imageCache.get(CardImageCache.cardKey(personId, side))
  }

  /** Store a card image in cache. */
  setCard(personId: string, side: 'front' | 'back', dataUrl: string): void {
    this.imageCache.set(CardImageCache.cardKey(personId, side), dataUrl)
  }

  /**
   * Get a signed URL from cache, or fetch it and store.
   * `fetchFn` is only called on cache miss.
   */
  async getOrFetchUrl(
    storagePath: string,
    fetchFn: () => Promise<string>,
  ): Promise<string> {
    const cached = this.urlCache.get(storagePath)
    if (cached) return cached

    const url = await fetchFn()
    this.urlCache.set(storagePath, url)
    return url
  }

  /** Number of cached items. */
  get size(): number {
    return this.imageCache.size + this.urlCache.size
  }

  /** Clear all cached data (call when leaving print context). */
  clear(): void {
    this.imageCache.clear()
    this.urlCache.clear()
  }
}
