import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { AdminModal } from './AdminModal';
import { cn } from '../../lib/utils';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  loading = false
}: ConfirmDialogProps) {
  
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertCircle className="w-6 h-6 text-rose-500" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-500" />;
      case 'warning':
      default:
        return <AlertTriangle className="w-6 h-6 text-amber-500" />;
    }
  };

  const getConfirmBtnClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'warning':
      default:
        return 'bg-amber-600 hover:bg-amber-700 text-white';
    }
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onCancel}
      title=""
      size="sm"
      className="overflow-hidden"
    >
      <div className="flex flex-col items-center text-center pt-2 pb-1">
        <div className={cn(
          "w-12 h-12 flex items-center justify-center rounded-full mb-3",
          variant === 'danger' && "bg-rose-100",
          variant === 'warning' && "bg-amber-100",
          variant === 'info' && "bg-blue-100"
        )}>
          {getIcon()}
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
        <p className="text-slate-500 text-xs leading-relaxed">{message}</p>
      </div>

      <div className="flex items-center justify-center gap-2.5 mt-5">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-lg text-slate-700 font-semibold text-xs bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            "px-3.5 py-1.5 rounded-lg font-bold text-xs transition-colors disabled:opacity-50 flex items-center justify-center min-w-[80px] cursor-pointer",
            getConfirmBtnClass()
          )}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            confirmText
          )}
        </button>
      </div>
    </AdminModal>
  );
}
