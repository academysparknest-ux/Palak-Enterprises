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
        return <AlertCircle className="w-10 h-10 text-rose-500" />;
      case 'info':
        return <Info className="w-10 h-10 text-blue-500" />;
      case 'warning':
      default:
        return <AlertTriangle className="w-10 h-10 text-amber-500" />;
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
      <div className="flex flex-col items-center text-center pt-4 pb-2">
        <div className={cn(
          "w-16 h-16 flex items-center justify-center rounded-full mb-4",
          variant === 'danger' && "bg-rose-100",
          variant === 'warning' && "bg-amber-100",
          variant === 'info' && "bg-blue-100"
        )}>
          {getIcon()}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm">{message}</p>
      </div>

      <div className="flex items-center justify-center gap-3 mt-8">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 rounded-xl text-slate-700 font-medium bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            "px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]",
            getConfirmBtnClass()
          )}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            confirmText
          )}
        </button>
      </div>
    </AdminModal>
  );
}
