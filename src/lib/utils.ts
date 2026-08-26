import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Checks whether an error is caused by lack of role permissions / RLS denial.
 */
export function isPermissionDenied(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || error.details || error.hint || error.error_description || String(error)).toLowerCase();
  const code = String(error.code || error.statusCode || error.status || "").toUpperCase();
  return (
    code === "403" ||
    code === "42501" ||
    code === "PGRST301" && (msg.includes("permission") || msg.includes("forbidden")) ||
    msg.includes("row-level security") ||
    msg.includes("permission denied") ||
    msg.includes("violates rls") ||
    msg.includes("forbidden") ||
    msg.includes("insufficient_privilege")
  );
}

/**
 * Checks whether an error is caused specifically by JWT time synchronization / clock skew issues
 * (e.g., PostgREST PGRST303 "JWT issued at future", nbf/iat clock skew).
 */
export function isAuthTokenTimeInvalid(error: any): boolean {
  if (!error) return false;
  if (isPermissionDenied(error)) return false;

  const code = String(error.code || error.statusCode || error.status || "").toUpperCase();
  const msg = (error.message || error.details || error.hint || error.error_description || String(error)).toLowerCase();

  // PostgREST PGRST303 is strictly "JWT issued at future" or timing error
  if (code === "PGRST303") return true;

  return (
    msg.includes("issued at future") ||
    msg.includes("jwt issued at future") ||
    msg.includes("jwt not active yet") ||
    msg.includes("token not active yet") ||
    msg.includes("not yet valid") ||
    msg.includes("used before issued") ||
    msg.includes("nbf claim in the future") ||
    msg.includes("iat claim in the future")
  );
}

/**
 * Checks whether an error is caused by genuine authentication session expiration or invalid session.
 */
export function isAuthSessionExpired(error: any): boolean {
  if (!error) return false;
  if (isPermissionDenied(error)) return false;
  if (isAuthTokenTimeInvalid(error)) return false;

  const msg = (error.message || error.details || error.hint || error.error_description || String(error)).toLowerCase();
  const code = String(error.code || error.statusCode || error.status || "").toUpperCase();

  return (
    code === "401" ||
    code === "INVALID_JWT" ||
    code === "PGRST301" ||
    msg.includes("jwt expired") ||
    msg.includes("token expired") ||
    msg.includes("invalid jwt") ||
    msg.includes("invalid token") ||
    msg.includes("invalid_grant") ||
    msg.includes("session_not_found") ||
    msg.includes("refresh_token_not_found") ||
    msg.includes("invalid refresh token") ||
    msg.includes("session has expired") ||
    msg.includes("jws")
  );
}

/**
 * Checks whether an error is any authentication failure (time invalid, expired, or invalid token).
 */
export function isAuthError(error: any): boolean {
  if (!error) return false;
  if (isPermissionDenied(error)) return false;
  const status = Number(error.status || error.statusCode);
  const code = String(error.code || "").toUpperCase();
  if (status === 401 || code === "401" || code === "PGRST303" || code === "INVALID_JWT") {
    return true;
  }
  return isAuthTokenTimeInvalid(error) || isAuthSessionExpired(error);
}

/**
 * Checks whether an error is a network or connectivity failure.
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const msg = (error.message || error.details || error.hint || String(error)).toLowerCase();
  return (
    error instanceof TypeError && (msg.includes("fetch") || msg.includes("network")) ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("econnrefused") ||
    msg.includes("timeout") ||
    msg.includes("aborterror")
  );
}

/**
 * Decodes the JWT payload locally for diagnostics ONLY.
 * NEVER logs or returns the complete access token or secret signature.
 */
export function inspectJwtTiming(token?: string): {
  iat?: number;
  exp?: number;
  sub?: string;
  iss?: string;
  aud?: string;
  role?: string;
  browserUnixSec: number;
  diffIatVsBrowserSec?: number;
  diffExpVsBrowserSec?: number;
} | null {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    const browserUnixSec = Math.floor(Date.now() / 1000);
    const iat = typeof payload.iat === "number" ? payload.iat : undefined;
    const exp = typeof payload.exp === "number" ? payload.exp : undefined;

    return {
      iat,
      exp,
      sub: payload.sub,
      iss: payload.iss,
      aud: payload.aud,
      role: payload.role,
      browserUnixSec,
      diffIatVsBrowserSec: iat !== undefined ? iat - browserUnixSec : undefined,
      diffExpVsBrowserSec: exp !== undefined ? exp - browserUnixSec : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Sanitizes and maps raw database / network / auth errors into clear, professional, non-technical feedback.
 */
export function formatAdminErrorMessage(error: any, fallback: string = "Operation failed. Please try again."): string {
  if (!error) return fallback;
  const msg = (error.message || error.details || error.hint || String(error)).toLowerCase();

  // 1. Permission / Row Level Security (RLS)
  if (isPermissionDenied(error)) {
    return "You don't have permission to access this resource. Please verify your account role.";
  }

  // 2. Token Time Synchronization / Clock Skew
  if (isAuthTokenTimeInvalid(error)) {
    return "Authentication server time synchronization in progress. Please retry in a moment.";
  }

  // 3. Session Expiration
  if (isAuthSessionExpired(error)) {
    return "Your session has expired. Please sign in again.";
  }

  // 4. Authentication Required
  if (msg.includes("unauthenticated") || msg.includes("not authenticated") || msg.includes("user not found")) {
    return "Authentication required. Please sign in to continue.";
  }

  // 5. Network / Connection Error
  if (isNetworkError(error)) {
    return "Unable to connect to the server. Please check your internet connection and retry.";
  }

  // 6. Foreign Key / Constraint Violation
  if (msg.includes("cannot delete") || msg.includes("in use by") || msg.includes("foreign key") || msg.includes("violates foreign key constraint")) {
    return "Cannot complete operation: This record is currently linked to other active records.";
  }

  // 7. Unique Constraint / Duplicate Key
  if (msg.includes("duplicate key") || msg.includes("unique constraint") || msg.includes("already exists") || msg.includes("23505")) {
    return "An item with this name, code, or identifier already exists.";
  }

  // 8. General database error fallback
  return error.message || fallback;
}


