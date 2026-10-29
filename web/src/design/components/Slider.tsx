import React from 'react';

export interface SliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (val: number) => void;
  unit?: string;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  unit = '',
  className = '',
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex justify-between items-center text-xs">
        <span className="text-text-400 font-medium">{label}</span>
        <span className="font-mono text-brass-400 font-medium tabular-nums">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-ink-950 rounded-lg appearance-none cursor-pointer accent-brass-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass-400 border border-ink-700"
      />
    </div>
  );
};

