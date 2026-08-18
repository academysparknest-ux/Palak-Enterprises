import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * Enhanced lazy loader that recovers from network failures and outdated cached chunks
 * across new deployments.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    const pageHasBeenForceRefreshed = window.sessionStorage.getItem("palak_chunk_retry_attempted");

    try {
      const component = await factory();
      window.sessionStorage.removeItem("palak_chunk_retry_attempted");
      return component;
    } catch (error: any) {
      console.warn("[Palak Lazy Loader] Dynamic import failed, attempting recovery...", error);

      if (!pageHasBeenForceRefreshed) {
        // Mark that we tried reloading so we don't infinite loop
        window.sessionStorage.setItem("palak_chunk_retry_attempted", "true");
        window.location.reload();
        return new Promise(() => {}); // Wait indefinitely while browser reloads
      }

      // If already reloaded once and still failed, throw to ErrorBoundary
      throw error;
    }
  });
}
