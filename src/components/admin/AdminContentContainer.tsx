import React from 'react';
import { cn } from '../../lib/utils';

export interface AdminContentContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard content container for all Admin ERP pages.
 * Ensures consistent width, left alignment immediately after the sidebar,
 * and eliminates unwanted page-level horizontal margins/centering.
 */
export const AdminContentContainer: React.FC<AdminContentContainerProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn("w-full space-y-6 max-w-none box-border", className)}>
      {children}
    </div>
  );
};

export default AdminContentContainer;
