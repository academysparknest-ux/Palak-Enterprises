/**
 * Environment-aware URL Helper for Supabase OAuth & Password Recovery
 * Ensures redirect URLs match the current development or production origin.
 */

export function getSiteOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return import.meta.env.VITE_SITE_URL || "http://localhost:5173";
}

/**
 * Returns the full callback URL for OAuth providers (e.g. Google Sign-In)
 */
export function getOAuthRedirectUrl(returnToPath?: string): string {
  const origin = getSiteOrigin();
  const baseCallback = `${origin}/auth/callback`;
  if (returnToPath && returnToPath !== "/") {
    return `${baseCallback}?returnTo=${encodeURIComponent(returnToPath)}`;
  }
  return baseCallback;
}

/**
 * Returns the full password reset destination URL for Supabase recovery emails
 */
export function getPasswordResetRedirectUrl(): string {
  const origin = getSiteOrigin();
  return `${origin}/reset-password`;
}
