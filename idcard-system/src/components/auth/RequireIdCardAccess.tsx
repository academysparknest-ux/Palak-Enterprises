import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';

const ALLOWED_ROLES = ['ADMIN', 'MANAGER', 'STAFF'];

// This guard is a UX convenience only — it stops an unauthorized user from
// staring at a page that will just error out. Actual protection lives in
// Postgres RLS (see supabase/migrations/0001_idcard_schema.sql).
export function RequireIdCardAccess({ children }: { children: ReactNode }) {
  const { status, role, error } = useAuth();

  if (status === 'INITIALIZING') {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Checking your session...
      </div>
    );
  }

  if (status === 'AUTH_ERROR') {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-800">Authentication error</p>
        <p className="mt-1 text-sm text-red-600">{error ?? 'Please try signing in again.'}</p>
      </div>
    );
  }

  if (status === 'UNAUTHENTICATED') {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center">
        <p className="font-medium text-slate-800">Please sign in</p>
        <p className="mt-1 text-sm text-slate-500">You need an account to access ID cards.</p>
      </div>
    );
  }

  if (!role || !ALLOWED_ROLES.includes(role)) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="font-medium text-amber-800">Access Denied</p>
        <p className="mt-1 text-sm text-amber-700">
          Your account doesn't have permission to manage ID cards.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
