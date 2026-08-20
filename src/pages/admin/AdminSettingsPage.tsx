import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { useToast } from '../../components/admin/AdminToast';
import { User, Lock, ExternalLink, Shield } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { user, isAdmin, isStaff } = useAuth();
  const { addToast } = useToast();
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const getRoleDisplay = () => {
    if (isAdmin) return 'Administrator';
    if (isStaff) return 'Staff Member';
    return 'User';
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      addToast({ type: 'error', title: 'Passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      addToast({ type: 'error', title: 'Password must be at least 6 characters' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;
      
      addToast({ type: 'success', title: 'Password updated successfully' });
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error updating password:', error);
      addToast({ type: 'error', title: error.message || 'Failed to update password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <AdminPageHeader 
          title="Account Settings" 
          subtitle="Manage your admin profile and security"
        />
        <a 
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors text-xs font-semibold shadow-xs w-full sm:w-auto"
        >
          <ExternalLink size={14} />
          <span>Preview Website</span>
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden h-fit">
          <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center gap-2.5">
            <User className="text-[#123B70]" size={18} />
            <h2 className="text-sm font-bold text-[#123B70]">Profile Information</h2>
          </div>
          <div className="p-4 sm:p-4.5 space-y-4">
            <div className="flex flex-col items-center pb-4 border-b border-slate-100">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-2 border border-slate-200">
                <Shield className="text-slate-400" size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {user?.name || user?.email || 'Admin User'}
              </h3>
              <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-semibold bg-[#123B70]/10 text-[#123B70] mt-0.5">
                {getRoleDisplay()}
              </span>
            </div>
            
            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Email Address</label>
                <div className="mt-0.5 text-slate-800 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {user?.email}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Account ID</label>
                <div className="mt-0.5 text-slate-500 text-xs font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100 truncate">
                  {user?.id}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center gap-2.5">
            <Lock className="text-[#123B70]" size={18} />
            <h2 className="text-sm font-bold text-[#123B70]">Security Settings</h2>
          </div>
          <div className="p-4 sm:p-4.5">
            <h3 className="text-xs font-bold text-slate-800 mb-3">Change Password</h3>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-[#123B70]/20 focus:border-[#123B70]"
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-[#123B70]/20 focus:border-[#123B70]"
                  placeholder="Confirm your new password"
                />
              </div>
              <div className="pt-1.5">
                <button
                  type="submit"
                  disabled={isChangingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  className="w-full flex justify-center py-1.5 px-3 border border-transparent rounded-lg shadow-xs text-xs font-semibold text-white bg-[#123B70] hover:bg-[#123B70]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#123B70] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
            
            <div className="mt-5 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 mb-1">Active Sessions</h3>
              <p className="text-xs text-slate-500">
                You are currently logged in from this device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
