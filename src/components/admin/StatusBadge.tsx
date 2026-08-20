import { cn } from '../../lib/utils';

export interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, variant, size = 'md', className }: StatusBadgeProps) {
  // Auto-map variant based on status if not provided
  const getVariant = () => {
    if (variant) return variant;
    
    const lowerStatus = status.toLowerCase();
    if (['active', 'completed', 'success', 'delivered', 'done'].includes(lowerStatus)) return 'success';
    if (['inactive', 'cancelled', 'failed', 'danger', 'error'].includes(lowerStatus)) return 'danger';
    if (['pending', 'processing', 'warning', 'hold'].includes(lowerStatus)) return 'warning';
    if (['new', 'info', 'shipped'].includes(lowerStatus)) return 'info';
    if (['draft', 'neutral', 'archived'].includes(lowerStatus)) return 'neutral';
    
    return 'default';
  };

  const currentVariant = getVariant();

  const variantClasses = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    danger: 'bg-rose-100 text-rose-800 border-rose-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    neutral: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.2 text-[10px] font-bold',
    md: 'px-2 py-0.5 text-xs font-semibold'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-medium border rounded-full',
        variantClasses[currentVariant],
        sizeClasses[size],
        className
      )}
    >
      {status.toUpperCase()}
    </span>
  );
}
