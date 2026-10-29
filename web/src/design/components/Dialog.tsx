import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  className = '',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog box */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full max-w-lg bg-ink-900 border border-ink-700 rounded-lg shadow-panel z-10 overflow-hidden ${className}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-700 bg-ink-950/50">
          <h2 className="font-serif text-base font-semibold text-text-100 tracking-wide uppercase">
            {title}
          </h2>
          <IconButton
            icon={<X className="w-4 h-4" />}
            label="Close"
            variant="ghost"
            size="sm"
            onClick={onClose}
          />
        </div>

        <div className="p-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-ink-700 bg-ink-950/40">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

