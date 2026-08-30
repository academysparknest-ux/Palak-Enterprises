import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useScrollLock } from '../../hooks/useScrollLock';

export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  closeOnBackdropClick?: boolean;
  preventEscapeClose?: boolean;
  hideCloseButton?: boolean;
  zIndexClass?: string;
  'aria-describedby'?: string;
}

const SIZE_MAP: Record<ModalSize, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
  '3xl': 'max-w-5xl',
  '4xl': 'max-w-6xl',
  full: 'max-w-[calc(100vw-24px)] sm:max-w-[calc(100vw-48px)] h-[calc(100dvh-24px)] sm:h-[calc(100dvh-48px)]',
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'md',
  className,
  bodyClassName,
  headerClassName,
  footerClassName,
  closeOnBackdropClick = false,
  preventEscapeClose = false,
  hideCloseButton = false,
  zIndexClass = 'z-50',
  'aria-describedby': ariaDescribedBy,
}: ModalProps) {
  const titleId = useId();
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Background page scroll lock with scrollbar width compensation and position preservation
  useScrollLock(isOpen);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element to restore focus on close
    previousActiveElementRef.current = (document.activeElement as HTMLElement) || null;

    // Initial focus into modal
    const focusTimer = setTimeout(() => {
      if (!modalContainerRef.current) return;
      const focusable = modalContainerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        // Focus first element or container
        focusable[0].focus();
      } else {
        modalContainerRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !preventEscapeClose) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalContainerRef.current) {
        const focusables = Array.from(
          modalContainerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null && !el.hasAttribute('disabled'));

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || document.activeElement === modalContainerRef.current) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to triggering button
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose, preventEscapeClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  };

  const hasHeader = Boolean(title || subtitle || icon || !hideCloseButton);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={ariaDescribedBy}
      className={cn(
        'fixed inset-0 flex items-center justify-center p-3 sm:p-4 md:p-6',
        'bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200',
        'overflow-hidden touch-none print:hidden',
        zIndexClass
      )}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalContainerRef}
        tabIndex={-1}
        className={cn(
          'w-full bg-white rounded-2xl shadow-2xl border border-slate-100/80',
          'flex flex-col max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-48px)]',
          'outline-none transform transition-all duration-200 animate-in fade-in zoom-in-95',
          SIZE_MAP[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        {hasHeader && (
          <div
            className={cn(
              'flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-4.5 shrink-0 bg-white rounded-t-2xl',
              headerClassName
            )}
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              {icon && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shadow-2xs">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h2
                    id={titleId}
                    className="text-base sm:text-lg font-bold text-slate-900 leading-snug truncate"
                  >
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed truncate-2-lines">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer shrink-0 ml-2 focus:outline-none focus:ring-2 focus:ring-slate-400/40"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body */}
        <div
          className={cn(
            'flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6',
            bodyClassName
          )}
        >
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div
            className={cn(
              'flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-5 py-3.5 sm:px-6 sm:py-4 rounded-b-2xl shrink-0',
              footerClassName
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/**
 * Reusable Confirmation Dialog primitive
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  loading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnBackdropClick={!loading}
      preventEscapeClose={loading}
      footer={
        <>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              'rounded-lg px-4 py-2 text-xs font-semibold text-white transition shadow-2xs cursor-pointer disabled:opacity-50',
              isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'
            )}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </>
      }
    >
      <div className="text-xs text-slate-600 leading-relaxed">{message}</div>
    </Modal>
  );
}
