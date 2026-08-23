import { useState, useEffect, useCallback } from "react";
import {
  getQuickServices,
  subscribeToQuickServices,
  type QuickServiceItem,
} from "../lib/supabase/database";

/**
 * Hook to monitor live availability for a single Quick Service
 */
export function useQuickServiceAvailability(serviceId: string) {
  const [service, setService] = useState<QuickServiceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchService = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const services = await getQuickServices();
      const match = services.find((s) => s.id === serviceId);
      setService(match || null);
    } catch (err) {
      console.warn(`Failed to fetch quick service availability for ${serviceId}:`, err);
      setError("Failed to load service status");
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    let mounted = true;

    fetchService();

    const unsubscribe = subscribeToQuickServices((services) => {
      if (mounted) {
        const match = services.find((s) => s.id === serviceId);
        setService(match || null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [serviceId, fetchService]);

  const isStopped = service ? service.is_active === false : false;
  const stopReason = service?.stop_reason || null;

  return {
    service,
    isActive: !loading && !error && !isStopped && !!service,
    isStopped,
    stopReason,
    loading,
    error,
    refresh: fetchService,
  };
}

/**
 * Hook to monitor live availability for all Quick Services simultaneously
 */
export function useAllQuickServicesAvailability() {
  const [services, setServices] = useState<QuickServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getQuickServices();
      setServices(data);
    } catch (err) {
      console.warn("Failed to fetch all quick services availability:", err);
      setError("Unable to load service availability. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    fetchAll();

    const unsubscribe = subscribeToQuickServices((fresh) => {
      if (mounted) {
        setServices(fresh);
        setLoading(false);
        setError(null);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [fetchAll]);

  const getService = useCallback(
    (id: string): QuickServiceItem | undefined => {
      return services.find((s) => s.id === id);
    },
    [services]
  );

  const isServiceStopped = useCallback(
    (id: string): boolean => {
      const match = services.find((s) => s.id === id);
      return match ? match.is_active === false : false;
    },
    [services]
  );

  const getStopReason = useCallback(
    (id: string): string | null => {
      const match = services.find((s) => s.id === id);
      return match?.stop_reason || null;
    },
    [services]
  );

  return {
    services,
    loading,
    error,
    getService,
    isServiceStopped,
    getStopReason,
    refresh: fetchAll,
  };
}
