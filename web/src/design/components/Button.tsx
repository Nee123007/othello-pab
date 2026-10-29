import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass-400 disabled:opacity-40 disabled:pointer-events-none rounded select-none';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1 gap-1.5 h-7',
    md: 'text-sm px-3.5 py-1.5 gap-2 h-9',
    lg: 'text-base px-4 py-2 gap-2.5 h-10',
  }[size];

  const variantStyles = {
    primary:
      'bg-brass-400 text-ink-950 font-semibold hover:bg-brass-600 active:bg-brass-600 border border-brass-400/30 shadow-sm',
    secondary:
      'bg-ink-800 text-text-100 border border-ink-700 hover:bg-ink-700 hover:border-text-400/40 active:bg-ink-700',
    ghost:
      'text-text-400 hover:text-text-100 hover:bg-ink-800/60 active:bg-ink-800 border border-transparent',
    danger:
      'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 active:bg-danger/30',
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

