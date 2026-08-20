import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, LayoutDashboard, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminAccessDeniedProps {
  requiredRole?: 'MANAGER' | 'ADMIN';
  message?: string;
}

export const AdminAccessDenied: React.FC<AdminAccessDeniedProps> = ({
  requiredRole = 'MANAGER',
  message,
}) => {
  const { user } = useAuth();
  const currentRole = (user?.role || 'STAFF').toUpperCase();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-lg w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            Current Role: {currentRole}
          </span>
          <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            {message ||
              `Website catalog, pricing, media assets, and content management require ${
                requiredRole === 'ADMIN' ? 'Administrator' : 'Store Manager or Administrator'
              } authorization.`}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/admin"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#123B70] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0c274c] transition-colors w-full sm:w-auto shadow-xs"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </Link>
          <Link
            to="/admin/orders"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors w-full sm:w-auto"
          >
            <Package className="w-4 h-4" />
            <span>View Orders</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminAccessDenied;
