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
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <AdminPageHeader 
          title="Account Settings" 
          subtitle="Manage your admin profile and security"
        />
        <a 
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors font-medium shadow-sm w-full sm:w-auto"
        >
          <ExternalLink size={18} />
          <span>Preview Website</span>
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
          <div className="p-6 border-b border-slate-200 flex items-center gap-3">
            <User className="text-[#123B70]" size={24} />
            <h2 className="text-lg font-semibold text-[#123B70]">Profile Information</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-col items-center pb-6 border-b border-slate-100">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-3 border border-slate-200">
                <Shield className="text-slate-400" size={32} />
              </div>
              <h3 className="text-lg font-medium text-slate-800">
                {user?.name || user?.email || 'Admin User'}
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#123B70]/10 text-[#123B70] mt-1">
                {getRoleDisplay()}
              </span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 font-medium uppercase tracking-wider">Email Address</label>
                <div className="mt-1 text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {user?.email}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium uppercase tracking-wider">Account ID</label>
                <div className="mt-1 text-slate-500 text-sm font-mono bg-slate-50 p-3 rounded-lg border border-slate-100 truncate">
                  {user?.id}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center gap-3">
            <Lock className="text-[#123B70]" size={24} />
            <h2 className="text-lg font-semibold text-[#123B70]">Security Settings</h2>
          </div>
          <div className="p-6">
            <h3 className="font-medium text-slate-800 mb-4">Change Password</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-[#123B70]/20 focus:border-[#123B70]"
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-[#123B70]/20 focus:border-[#123B70]"
                  placeholder="Confirm your new password"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#123B70] hover:bg-[#123B70]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#123B70] disabled:opacity-50 transition-colors"
                >
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
            
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h3 className="font-medium text-slate-800 mb-2">Active Sessions</h3>
              <p className="text-sm text-slate-500 mb-4">
                You are currently logged in from this device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
