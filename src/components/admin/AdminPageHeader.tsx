import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: any;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
}

export function AdminPageHeader({
  title,
  subtitle,
  description,
  breadcrumbs,
  actions
}: AdminPageHeaderProps) {
  const sub = subtitle || description;

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-4 sm:mb-5">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-1 text-xs text-slate-500 mb-1.5">
            <Link to="/admin" className="hover:text-[#123B70] transition-colors flex items-center">
              <Home className="w-3.5 h-3.5" />
            </Link>
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center space-x-1">
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                {crumb.href ? (
                  <Link to={crumb.href} className="hover:text-[#123B70] transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-900 font-semibold">{crumb.label}</span>
                )}
              </div>
            ))}
          </nav>
        )}
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {sub && (
          <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
