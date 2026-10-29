import React from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs font-medium text-text-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        className={`w-full bg-ink-950 border border-ink-700 text-text-100 text-xs rounded px-3 py-2 appearance-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass-400 cursor-pointer ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-ink-900 text-text-100">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

