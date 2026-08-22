/**
 * Global Scroll Lock Engine for Palak Enterprises
 * 
 * Provides bulletproof, reference-counted background scroll locking across
 * all desktop and mobile browsers (including iOS Safari).
 * 
 * Features:
 * - Reference counting (nested modals/dialogs support)
 * - Exact scroll position preservation (scrollX, scrollY)
 * - Scrollbar width compensation (prevents horizontal layout shift)
 * - Original style preservation and faithful restoration
 * - Safe against route transitions and unmounting
 */

interface SavedBodyStyles {
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyWidth: string;
  bodyPaddingRight: string;
  bodyScrollBehavior: string;
  htmlOverflow: string;
  htmlScrollBehavior: string;
}

class ScrollLockManager {
  private lockCount = 0;
  private savedScrollX = 0;
  private savedScrollY = 0;
  private savedStyles: SavedBodyStyles | null = null;

  /**
   * Request a scroll lock. If this is the first active lock,
   * it captures scroll coordinates and freezes the background document.
   */
  public lock(options: { reserveScrollBarGap?: boolean } = { reserveScrollBarGap: true }): void {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    if (this.lockCount === 0) {
      // 1. Capture exact current scroll position before modifying any styles
      this.savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      this.savedScrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;

      // 2. Measure scrollbar width to prevent horizontal layout shift
      const hasVerticalScrollbar = window.innerWidth > document.documentElement.clientWidth;
      const scrollbarWidth = hasVerticalScrollbar
        ? window.innerWidth - document.documentElement.clientWidth
        : 0;

      // 3. Save original inline styles for accurate restoration
      this.savedStyles = {
        bodyOverflow: document.body.style.overflow,
        bodyPosition: document.body.style.position,
        bodyTop: document.body.style.top,
        bodyLeft: document.body.style.left,
        bodyWidth: document.body.style.width,
        bodyPaddingRight: document.body.style.paddingRight,
        bodyScrollBehavior: document.body.style.scrollBehavior,
        htmlOverflow: document.documentElement.style.overflow,
        htmlScrollBehavior: document.documentElement.style.scrollBehavior,
      };

      // 4. Calculate target right padding (accounting for existing inline padding if any)
      if (options.reserveScrollBarGap && scrollbarWidth > 0) {
        const existingPadding = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
        document.body.style.paddingRight = `${existingPadding + scrollbarWidth}px`;
      }

      // 5. Freeze background document completely (iOS Safari + Desktop friendly)
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${this.savedScrollY}px`;
      document.body.style.left = `-${this.savedScrollX}px`;
      document.body.style.width = "100%";
    }

    this.lockCount++;
  }

  /**
   * Release a scroll lock. When the active lock count drops to zero,
   * document styles and exact scroll positions are restored.
   */
  public unlock(): void {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    if (this.lockCount <= 0) {
      this.lockCount = 0;
      return;
    }

    this.lockCount--;

    if (this.lockCount === 0) {
      this.restoreOriginalState();
    }
  }

  /**
   * Emergency reset method to ensure the app is never left permanently locked.
   */
  public forceUnlockAll(): void {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    if (this.lockCount > 0) {
      this.lockCount = 0;
      this.restoreOriginalState();
    }
  }

  /**
   * Check if the document scroll is currently locked.
   */
  public isLocked(): boolean {
    return this.lockCount > 0;
  }

  /**
   * Current active lock counter.
   */
  public getLockCount(): number {
    return this.lockCount;
  }

  private restoreOriginalState(): void {
    const scrollX = this.savedScrollX;
    const scrollY = this.savedScrollY;
    const styles = this.savedStyles;

    // Temporarily disable smooth scrolling to prevent animated jumps during restoration
    document.documentElement.style.scrollBehavior = "auto";
    document.body.style.scrollBehavior = "auto";

    if (styles) {
      document.documentElement.style.overflow = styles.htmlOverflow;
      document.body.style.overflow = styles.bodyOverflow;
      document.body.style.position = styles.bodyPosition;
      document.body.style.top = styles.bodyTop;
      document.body.style.left = styles.bodyLeft;
      document.body.style.width = styles.bodyWidth;
      document.body.style.paddingRight = styles.bodyPaddingRight;
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.width = "";
      document.body.style.paddingRight = "";
    }

    this.savedStyles = null;

    // Restore exact scroll position instantaneously
    if (typeof window.scrollTo === "function") {
      try {
        window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" as ScrollBehavior });
      } catch {
        window.scrollTo(scrollX, scrollY);
      }
    }

    // Re-apply original scroll behavior styles
    document.documentElement.style.scrollBehavior = styles?.htmlScrollBehavior || "";
    document.body.style.scrollBehavior = styles?.bodyScrollBehavior || "";
  }
}

export const scrollLock = new ScrollLockManager();
