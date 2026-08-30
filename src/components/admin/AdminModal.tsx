import React from 'react';
import { Modal, type ModalSize } from '../ui/Modal';

export interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  className?: string;
}

export function AdminModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  footer,
  className
}: AdminModalProps) {
  const sizeMap: Record<'sm' | 'md' | 'lg' | 'xl', ModalSize> = {
    sm: 'sm',
    md: 'md',
    lg: 'xl',
    xl: '2xl'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size={sizeMap[size] || 'md'}
      footer={footer}
      className={className}
      closeOnBackdropClick={false}
    >
      {children}
    </Modal>
  );
}
