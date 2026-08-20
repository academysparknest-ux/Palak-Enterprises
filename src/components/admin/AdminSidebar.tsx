import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Wallet,
  Zap,
  Globe,
  FileText,
  MessageSquare,
  Palette,
  Settings,
  ChevronDown,
  ChevronRight,
  Bell,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  newOrdersCount?: number;
  unreadNotificationsCount?: number;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen,
  onClose,
  newOrdersCount = 0,
  unreadNotificationsCount = 0,
}) => {
  const location = useLocation();
  const [isWebsiteMgmtOpen, setIsWebsiteMgmtOpen] = useState(
    location.pathname.startsWith('/admin/website')
  );

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Orders', path: '/admin/orders', icon: Package, badge: newOrdersCount },
    { name: 'Payments', path: '/admin/payments', icon: Wallet },
    { name: 'Quick Services', path: '/admin/quick-services', icon: Zap },
  ];

  const websiteSubItems = [
    { name: 'Overview', path: '/admin/website' },
    { name: 'Services', path: '/admin/website/services' },
    { name: 'Pricing', path: '/admin/website/pricing' },
    { name: 'Photos / Media', path: '/admin/website/photos' },
    { name: 'Categories', path: '/admin/website/categories' },
    { name: 'Homepage Content', path: '/admin/website/content' },
    { name: 'Analytics', path: '/admin/website/analytics' },
    { name: 'Activity Log', path: '/admin/website/activity' },
  ];

  const bottomItems = [
    { name: 'Service Requests', path: '/admin/services-requests', icon: FileText },
    { name: 'Quote Inquiries', path: '/admin/quotes', icon: MessageSquare },
    { name: 'Design Studio', path: '/admin/designs', icon: Palette },
    { name: 'Notifications', path: '/admin/notifications', icon: Bell, badge: unreadNotificationsCount },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[286px] flex-col bg-[#0F172A] text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:shrink-0 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header - shown on mobile only */}
        <div className="flex h-14 items-center justify-between px-6 border-b border-slate-800 lg:hidden">
          <Link to="/admin" className="flex items-center gap-2 font-bold text-lg tracking-tight text-white">
            <span className="text-amber-500">Palak</span> Admin
          </Link>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-700/50 text-white border-l-4 border-amber-500"
                    : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                )}
              >
                <item.icon className={cn("h-5 w-5", active ? "text-amber-500" : "text-slate-400")} />
                <span className="flex-1">{item.name}</span>
                {item.badge ? (
                  <span className="flex h-5 items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}

          {/* Collapsible Website Management */}
          <div>
            <button
              onClick={() => setIsWebsiteMgmtOpen(!isWebsiteMgmtOpen)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                location.pathname.startsWith('/admin/website')
                  ? "bg-slate-700/50 text-white border-l-4 border-amber-500"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              )}
            >
              <Globe className={cn("h-5 w-5", location.pathname.startsWith('/admin/website') ? "text-amber-500" : "text-slate-400")} />
              <span className="flex-1 text-left">Website</span>
              {isWebsiteMgmtOpen ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>
            
            <div
              className={cn(
                "mt-1 space-y-1 overflow-hidden transition-all duration-200 ease-in-out",
                isWebsiteMgmtOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              )}
            >
              {websiteSubItems.map((subItem) => {
                const subActive = location.pathname === subItem.path;
                return (
                  <Link
                    key={subItem.name}
                    to={subItem.path}
                    className={cn(
                      "flex items-center gap-3 rounded-lg py-2 pl-11 pr-3 text-sm transition-colors",
                      subActive
                        ? "font-semibold text-amber-400"
                        : "text-slate-400 hover:bg-slate-800/30 hover:text-white"
                    )}
                  >
                    {subItem.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 space-y-1">
            {bottomItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-slate-700/50 text-white border-l-4 border-amber-500"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", active ? "text-amber-500" : "text-slate-400")} />
                  <span className="flex-1">{item.name}</span>
                  {item.badge ? (
                    <span className="flex h-5 items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-200">Palak Enterprises</span>
            <span className="text-xs text-slate-500">v1.0.0 &copy; 2026</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export { AdminSidebar };
export default AdminSidebar;
