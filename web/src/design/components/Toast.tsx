import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'error';
  onClose?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  onClose,
  className = '',
}) => {
  const icon = {
    info: <Info className="w-4 h-4 text-brass-400" />,
    success: <CheckCircle className="w-4 h-4 text-signal" />,
    error: <AlertCircle className="w-4 h-4 text-danger" />,
  }[type];

  return (
    <div
      role="status"
      className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 bg-ink-900 border border-ink-700 text-xs text-text-100 rounded-lg shadow-panel animate-in fade-in slide-in-from-bottom-2 ${className}`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 text-text-400 hover:text-text-100 text-xs font-mono"
        >
          ×
        </button>
      )}
    </div>
  );
};

