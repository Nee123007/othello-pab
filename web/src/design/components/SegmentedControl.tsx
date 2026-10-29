import React from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (val: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const pad = size === 'sm' ? 'p-0.5' : 'p-1';
  const itemPad = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs';

  return (
    <div
      className={`inline-flex bg-ink-950 border border-ink-700 rounded ${pad} ${className}`}
      role="group"
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={`font-medium rounded transition-all select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass-400 ${itemPad} ${
              isSelected
                ? 'bg-ink-800 text-brass-400 shadow-sm border border-ink-700'
                : 'text-text-400 hover:text-text-100 hover:bg-ink-800/40 border border-transparent'
            } ${opt.disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

