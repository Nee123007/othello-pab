import React from 'react';

export interface DividerProps {
  label?: string;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ label, className = '' }) => {
  if (!label) {
    return <hr className={`border-t border-ink-700/80 my-3 ${className}`} />;
  }

  return (
    <div className={`relative flex items-center my-4 ${className}`}>
      <div className="flex-grow border-t border-ink-700/80" />
      <span className="flex-shrink mx-3 text-[11px] font-medium uppercase tracking-wider text-text-400">
        {label}
      </span>
      <div className="flex-grow border-t border-ink-700/80" />
    </div>
  );
};

