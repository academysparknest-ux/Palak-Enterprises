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
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-1 text-sm text-slate-500 mb-3">
            <Link to="/admin" className="hover:text-[#123B70] transition-colors flex items-center">
              <Home className="w-4 h-4" />
            </Link>
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center space-x-1">
                <ChevronRight className="w-4 h-4 text-slate-400" />
                {crumb.href ? (
                  <Link to={crumb.href} className="hover:text-[#123B70] transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-900 font-medium">{crumb.label}</span>
                )}
              </div>
            ))}
          </nav>
        )}
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h1>
        {sub && (
          <p className="text-slate-500 text-sm mt-1">{sub}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
