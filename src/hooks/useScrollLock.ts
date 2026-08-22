import { useEffect, useRef } from "react";
import { scrollLock } from "../lib/ui/scrollLock";

export interface UseScrollLockOptions {
  reserveScrollBarGap?: boolean;
}

/**
 * React hook to lock background document scrolling when a modal/dialog/overlay is active.
 * 
 * Automatically manages reference counting for nested dialogs and safely unlocks on unmount.
 * 
 * @param enabled Whether the scroll lock should be active (defaults to true)
 * @param options Configuration options, e.g. reserveScrollBarGap
 */
export function useScrollLock(
  enabled: boolean = true,
  options?: UseScrollLockOptions
): void {
  const isLockedRef = useRef(false);
  const reserveScrollBarGap = options?.reserveScrollBarGap ?? true;

  useEffect(() => {
    if (enabled) {
      if (!isLockedRef.current) {
        scrollLock.lock({ reserveScrollBarGap });
        isLockedRef.current = true;
      }
    } else {
      if (isLockedRef.current) {
        scrollLock.unlock();
        isLockedRef.current = false;
      }
    }

    return () => {
      if (isLockedRef.current) {
        scrollLock.unlock();
        isLockedRef.current = false;
      }
    };
  }, [enabled, reserveScrollBarGap]);
}

export { scrollLock };
