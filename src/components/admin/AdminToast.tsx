import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toast: (messageOrTitle: string, type?: 'success' | 'error' | 'info' | 'warning', message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (messageOrTitle: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', message?: string) => {
      addToast({
        title: messageOrTitle,
        type,
        message,
      });
    },
    [addToast]
  );

  useEffect(() => {
    const handleShowToast = (e: CustomEvent) => {
      if (e.detail && e.detail.title) {
        toast(e.detail.title, e.detail.type || 'info', e.detail.message);
      }
    };
    window.addEventListener('palak:show-toast' as any, handleShowToast);
    return () => {
      window.removeEventListener('palak:show-toast' as any, handleShowToast);
    };
  }, [toast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-0 right-0 z-[100] flex flex-col gap-2 p-4 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      const timer = setTimeout(() => {
        onRemove();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onRemove]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-200',
    error: 'bg-rose-50 border-rose-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 p-4 bg-white rounded-xl shadow-lg border animate-in slide-in-from-right-full fade-in duration-300',
        bgColors[toast.type]
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
        {toast.message && <p className="text-sm text-slate-600 mt-1">{toast.message}</p>}
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors rounded-full p-1 hover:bg-black/5 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
