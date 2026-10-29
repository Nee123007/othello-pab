import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  variant = 'secondary',
  size = 'md',
  className = '',
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
  }[size];

  const variantStyles = {
    primary: 'bg-brass-400 text-ink-950 hover:bg-brass-600',
    secondary: 'bg-ink-800 text-text-400 hover:text-text-100 hover:bg-ink-700 border border-ink-700',
    ghost: 'text-text-400 hover:text-text-100 hover:bg-ink-800 border border-transparent',
  }[variant];

  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass-400 disabled:opacity-40 disabled:pointer-events-none ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
};

