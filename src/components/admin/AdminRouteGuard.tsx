import React from 'react';
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
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#123B70]" />
      </div>
    );
  }

  const role = (user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isManager = role === 'MANAGER' || isAdmin;
  const isStaff = role === 'STAFF' || isManager;

  let hasPermission = false;
  if (requiredRole === 'STAFF') hasPermission = isStaff;
  else if (requiredRole === 'MANAGER') hasPermission = isManager;
  else if (requiredRole === 'ADMIN') hasPermission = isAdmin;

  if (!hasPermission) {
    return <AdminAccessDenied requiredRole={requiredRole === 'STAFF' ? 'MANAGER' : requiredRole} />;
  }

  return <>{children}</>;
};

export default AdminRouteGuard;
