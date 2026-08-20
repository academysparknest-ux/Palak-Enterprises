import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitizes and maps raw database / network errors into clear, professional, non-technical feedback.
 */
export function formatAdminErrorMessage(error: any, fallback: string = "Operation failed. Please try again."): string {
  if (!error) return fallback;
  const msg = (error.message || error.details || error.hint || String(error)).toLowerCase();

  if (msg.includes("row-level security") || msg.includes("permission denied") || msg.includes("violates rls")) {
    return "Permission Denied: Your staff role does not have authorization to perform this action.";
  }
  if (msg.includes("cannot delete category") || msg.includes("in use by") || msg.includes("foreign key")) {
    return "Cannot delete this category because active products or services are currently linked to it.";
  }
  if (msg.includes("duplicate key") || msg.includes("unique constraint") || msg.includes("already exists")) {
    return "An item with this name, code, or URL slug already exists.";
  }
  if (msg.includes("jwt") || msg.includes("token is expired") || msg.includes("invalid token")) {
    return "Your session has expired. Please log in again.";
  }
  if (msg.includes("network") || msg.includes("failed to fetch")) {
    return "Network connection issue. Please check your internet and retry.";
  }

  return error.message || fallback;
}
