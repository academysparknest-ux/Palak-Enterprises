import { useState, useEffect } from "react";
import {
  getQuickServices,
  subscribeToQuickServices,
  type QuickServiceItem,
  DEFAULT_QUICK_SERVICES,
} from "../lib/supabase/database";

export function useQuickServiceAvailability(serviceId: string) {
  const [service, setService] = useState<QuickServiceItem | null>(() => {
    const initial = DEFAULT_QUICK_SERVICES.find((s) => s.id === serviceId);
    return initial || null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getQuickServices()
      .then((services) => {
        if (mounted) {
          const match = services.find((s) => s.id === serviceId);
          if (match) setService(match);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const unsubscribe = subscribeToQuickServices((services) => {
      if (mounted) {
        const match = services.find((s) => s.id === serviceId);
        if (match) setService(match);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [serviceId]);

  const isStopped = service ? service.is_active === false : false;
  const stopReason = service?.stop_reason || null;

  return {
    service,
    isActive: !isStopped,
    isStopped,
    stopReason,
    loading,
  };
}
