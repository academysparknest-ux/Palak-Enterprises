import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { 
  supabase, 
  isSupabaseConfigured, 
  getEstimatedServerNowMs, 
  probeServerDate 
} from './client';
import { 
  isAuthTokenTimeInvalid, 
  isAuthSessionExpired, 
  isPermissionDenied, 
  isAuthError,
  inspectJwtTiming 
} from '../utils';

let inFlightRefreshPromise: Promise<Session | null> | null = null;
let currentSessionVersion = 0;
let requestCounter = 0;

/**
 * Returns the current session version counter.
 * Incremented whenever a new access token is obtained via session refresh.
 */
export function getSessionVersion(): number {
  return currentSessionVersion;
}

/**
 * Checks if a session refresh is currently in flight.
 */
export function isRefreshingSession(): boolean {
  return inFlightRefreshPromise !== null;
}

function requireSupabase(): SupabaseClient {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Database is not configured. Please check your Supabase connection.');
  }
  return supabase;
}

/**
 * Single-flight deduplicated session refresher.
 * Guarantees that only ONE refresh request is in-flight at any given time across all
 * components and database queries.
 */
export async function sharedRefreshSession(): Promise<Session | null> {
  if (inFlightRefreshPromise) {
    console.debug('[AUTH] refresh:join-existing');
    return inFlightRefreshPromise;
  }

  console.debug('[AUTH] refresh:start');
  inFlightRefreshPromise = (async () => {
    try {
      if (!isSupabaseConfigured || !supabase) {
        console.debug('[AUTH] refresh:failure (unconfigured)');
        return null;
      }

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        logAuthForensic('Session refresh error', error);
        console.debug('[AUTH] refresh:failure', { code: error?.code, status: (error as any)?.status });
        return null;
      }

      if (data?.session) {
        currentSessionVersion++;
        console.debug('[AUTH] refresh:success', { sessionVersion: currentSessionVersion });
        return data.session;
      }

      console.debug('[AUTH] refresh:failure (no session returned)');
      return null;
    } catch (err: any) {
      logAuthForensic('Session refresh unexpected failure', err);
      console.debug('[AUTH] refresh:failure (exception)', { message: err?.message });
      return null;
    } finally {
      inFlightRefreshPromise = null;
    }
  })();

  return inFlightRefreshPromise;
}

/**
 * Convenience helper returning boolean for database retry layers.
 */
export async function attemptSessionRefresh(): Promise<boolean> {
  const session = await sharedRefreshSession();
  return Boolean(session);
}

/**
 * Data-driven calculation of exact clock skew between JWT iat and PostgREST server time.
 * Calculates required wait in milliseconds (bounded up to 10 seconds max) so PostgREST's clock
 * catches up to the newly minted token before executing queries.
 *
 * Returns the milliseconds waited (0 if token is already valid).
 */
export async function calculateAndSettleClockSkew(
  sessionToken?: string | null,
  forceFreshProbe: boolean = false,
  isExplicitTimingError: boolean = false
): Promise<number> {
  if (!sessionToken || typeof sessionToken !== 'string') {
    if (isExplicitTimingError) {
      const fallbackWaitMs = 1000;
      await new Promise((resolve) => setTimeout(resolve, fallbackWaitMs));
      return fallbackWaitMs;
    }
    return 0;
  }
  const timing = inspectJwtTiming(sessionToken);
  if (!timing || typeof timing.iat !== 'number') {
    if (isExplicitTimingError) {
      const fallbackWaitMs = 1000;
      await new Promise((resolve) => setTimeout(resolve, fallbackWaitMs));
      return fallbackWaitMs;
    }
    return 0;
  }

  if (forceFreshProbe) {
    await probeServerDate();
  }

  const serverNowMs = getEstimatedServerNowMs();
  const tokenIatMs = timing.iat * 1000;
  const skewMs = tokenIatMs - serverNowMs;

  if (skewMs > 0 || isExplicitTimingError) {
    // 500ms safety margin because HTTP Date header has 1-second resolution
    const safetyMarginMs = 500;
    const calculatedWait = skewMs > 0 ? skewMs + safetyMarginMs : 1000;
    const requiredWaitMs = Math.min(Math.max(skewMs > 0 ? 500 : 1000, calculatedWait), 10000);
    console.info(
      `[AUTH] Clock skew detected (explicit=${isExplicitTimingError}): Token iat is ${Math.round(skewMs)}ms ahead of PostgREST clock. Waiting ${requiredWaitMs}ms before executing query...`
    );
    await new Promise((resolve) => setTimeout(resolve, requiredWaitMs));
    return requiredWaitMs;
  }

  return 0;
}

/**
 * Proactively checks if the current JWT token was minted with a future timestamp relative
 * to PostgREST server clock, giving PostgREST a brief moment to catch up.
 */
export async function ensureTokenSettled(client?: NonNullable<typeof supabase> | null): Promise<void> {
  try {
    const activeClient = client || supabase;
    if (!activeClient) return;
    const { data: { session } } = await activeClient.auth.getSession();
    if (!session?.access_token) return;
    await calculateAndSettleClockSkew(session.access_token, false, false);
  } catch {
    // Non-fatal
  }
}

/**
 * Universal authoritative database operation executor with data-driven auth recovery.
 *
 * ARCHITECTURE:
 *
 * 1. If an auth refresh is currently in flight, awaits the existing refresh before launching.
 * 2. If the operation succeeds -> Returns result immediately (0ms added delay for normal requests).
 * 3. If Permission / RLS denial (403, 42501) -> Throws immediately (0 retries).
 * 4. If Non-Auth error (schema syntax, constraint, network) -> Throws immediately (0 retries).
 * 5. If Auth error:
 *    a. If timing error (PGRST303 "JWT issued at future"):
 *       - Probes PostgREST server date fresh.
 *       - Calculates data-driven skew between token iat and PostgREST server clock.
 *       - Waits ONLY the calculated duration (+500ms safety margin, max 10s).
 *       - Retries with the current token. If that succeeds -> Returns result.
 *       - If still failing, triggers single-flight sharedRefreshSession(), settles the NEW token skew,
 *         and retries once more.
 *       - If still failing after bounded wait on fresh token -> Throws Device Time Out of Sync error.
 *    b. If session expired (401):
 *       - Triggers single-flight sharedRefreshSession(), settles new token skew, and retries.
 */
export async function executeWithAuthRetry<T>(
  operation: (client: NonNullable<typeof supabase>) => Promise<T>,
  optionsOrRetries: number | { maxRetries?: number; operationName?: string } = 1,
  operationNameFallback: string = 'operation'
): Promise<T> {
  const client = requireSupabase();
  const maxRetries = typeof optionsOrRetries === 'number' ? optionsOrRetries : (optionsOrRetries?.maxRetries ?? 1);
  const opName = typeof optionsOrRetries === 'object' && optionsOrRetries?.operationName 
    ? optionsOrRetries.operationName 
    : operationNameFallback;

  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startVersion = currentSessionVersion;
    const requestId = ++requestCounter;

    try {
      // If a refresh is currently running, wait for it so we use the freshest session
      if (inFlightRefreshPromise) {
        console.debug('[AUTH] request:awaiting-in-flight-refresh', { operation: opName, requestId });
        await inFlightRefreshPromise;
      }

      if (attempt === 0) {
        console.debug('[AUTH] operation:start', {
          operation: opName,
          requestId,
          sessionVersion: currentSessionVersion,
        });
      }



      const result = await operation(client);

      console.debug('[AUTH] operation:success', {
        operation: opName,
        requestId,
        attempt,
        sessionVersion: currentSessionVersion,
      });

      return result;
    } catch (err: any) {
      lastError = err;

      // 1. Permission / RLS denial — throw immediately (0 retries)
      if (isPermissionDenied(err)) {
        throw err;
      }

      const isTiming = isAuthTokenTimeInvalid(err);
      const isExpired = isAuthSessionExpired(err);
      const isAuthErr = isTiming || isExpired || isAuthError(err);

      // 2. Non-auth errors (constraints, syntax, network) — throw immediately
      if (!isAuthErr) {
        throw err;
      }

      // If attempts exhausted and no recovery possible on this round
      if (attempt >= maxRetries) {
        logAuthForensic(`Auth retry attempts exhausted for ${opName}`, err);
        throw err;
      }

      console.debug('[AUTH] operation:auth_retry_needed', {
        operation: opName,
        requestId,
        attempt: attempt + 1,
        isTiming,
        isExpired,
        sessionVersion: currentSessionVersion,
        code: err?.code,
        status: err?.status || (err as any)?.statusCode,
      });

      // 3. If timing issue (PGRST303), calculate exact data-driven skew against PostgREST server clock
      if (isTiming) {
        const { data: { session } } = await client.auth.getSession();
        const waitApplied = await calculateAndSettleClockSkew(session?.access_token, true, true);

        if (waitApplied > 0) {
          console.debug('[AUTH] operation:timing-settle-complete', {
            operation: opName,
            requestId,
            waitedMs: waitApplied,
          });
          continue;
        }
      }

      // 4. If session changed while request was in-flight, retry immediately with new session
      if (currentSessionVersion > startVersion) {
        console.debug('[AUTH] operation:retry', {
          operation: opName,
          requestId,
          reason: 'stale-token-session-version-changed',
          sessionVersion: currentSessionVersion,
        });
        await client.auth.getSession();
        continue;
      }

      // 5. Trigger single-flight shared session refresh
      const refreshedSession = await sharedRefreshSession();

      if (refreshedSession) {
        // Ensure new token's clock skew is settled against PostgREST server clock
        await calculateAndSettleClockSkew(refreshedSession.access_token, true);
        console.debug('[AUTH] operation:retry', {
          operation: opName,
          requestId,
          sessionVersion: currentSessionVersion,
        });
        continue;
      } else {
        // Refresh failed (or user is logged out) — throw auth error
        throw err;
      }
    }
  }

  throw lastError;
}

/**
 * Safe forensic logging utility.
 * Logs error diagnostics WITHOUT leaking access tokens, refresh tokens, passwords, cookies, or authorization headers.
 */
export function logAuthForensic(context: string, error: any): void {
  if (!error) return;

  const code = error?.code || error?.statusCode || error?.status;
  const status = error?.status || error?.statusCode;
  const message = error?.message || (typeof error === 'string' ? error : 'Unknown error');
  const details = error?.details;
  const hint = error?.hint;

  console.error(`[AUTH FORENSIC] ${context}:`, {
    code: code ? String(code) : undefined,
    status: status ? Number(status) : undefined,
    message: typeof message === 'string' ? message.slice(0, 300) : undefined,
    details: typeof details === 'string' ? details.slice(0, 300) : undefined,
    hint: typeof hint === 'string' ? hint.slice(0, 300) : undefined,
    isTimingError: isAuthTokenTimeInvalid(error),
    isExpired: isAuthSessionExpired(error),
    isPermissionDenied: isPermissionDenied(error),
    isRefreshing: inFlightRefreshPromise !== null,
    sessionVersion: currentSessionVersion,
    timestamp: new Date().toISOString(),
  });
}
