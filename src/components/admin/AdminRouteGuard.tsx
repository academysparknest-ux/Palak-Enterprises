import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdminAccessDenied } from './AdminAccessDenied';

interface AdminRouteGuardProps {
  requiredRole?: 'STAFF' | 'MANAGER' | 'ADMIN';
  children: React.ReactNode;
}

export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({
  requiredRole = 'MANAGER',
  children,
}) => {
  const { user, session, isAuthenticated, isStaff, isAdmin, loading, isReady, authError } = useAuth();

  // 1. Loading state
  if (loading || !isReady) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#123B70]" />
      </div>
    );
  }

  // 2. Auth initialization failure
  if (authError) {
    console.info("[ADMIN_BOOT] guard:auth_error", { authError, requiredRole });
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 max-w-md text-center space-y-4 shadow-lg">
          <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Authentication Failure</h2>
          <p className="text-xs text-slate-500">{authError}</p>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex-1 cursor-pointer"
            >
              Retry
            </button>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl bg-[#123B70] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0c274c] flex-1"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Must have an active authenticated Supabase session and user profile
  if (!isAuthenticated || !session?.user || !user) {
    console.info("[ADMIN_BOOT] guard:unauthorized", { reason: "no_active_session", requiredRole });
    return <AdminAccessDenied requiredRole={requiredRole === "STAFF" ? "MANAGER" : requiredRole} />;
  }

  const role = (user?.role || "").toUpperCase();
  const isUserAdmin = isAdmin || role === "ADMIN";
  const isUserManager = isUserAdmin || role === "MANAGER";
  const isUserStaff = isStaff || isUserManager || role === "STAFF";

  let hasPermission = false;
  if (requiredRole === "STAFF") hasPermission = isUserStaff;
  else if (requiredRole === "MANAGER") hasPermission = isUserManager;
  else if (requiredRole === "ADMIN") hasPermission = isUserAdmin;

  // 4. Role unauthorized
  if (!hasPermission) {
    console.info("[ADMIN_BOOT] guard:unauthorized", {
      reason: "insufficient_role",
      requiredRole,
      userRole: role,
    });
    return <AdminAccessDenied requiredRole={requiredRole === "STAFF" ? "MANAGER" : requiredRole} />;
  }

  console.info("[ADMIN_BOOT] guard:authorized", {
    requiredRole,
    userRole: role,
  });

  return <>{children}</>;
};

export default AdminRouteGuard;


