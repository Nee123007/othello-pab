import React from 'react';

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'default' | 'raised';
}

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  action,
  variant = 'default',
  children,
  className = '',
  ...props
}) => {
  const bg = variant === 'raised' ? 'bg-ink-800' : 'bg-ink-900';

  return (
    <div
      className={`${bg} border border-ink-700 rounded-lg overflow-hidden shadow-panel ${className}`}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-700 bg-ink-950/40">
          <div>
            {title && (
              <h3 className="font-serif text-sm font-semibold tracking-wide text-text-100 uppercase">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-text-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
};

