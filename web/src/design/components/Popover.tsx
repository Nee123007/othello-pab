import React, { useState, useRef, useEffect } from 'react';

export interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const Popover: React.FC<PopoverProps> = ({
  trigger,
  children,
  title,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-ink-900 border border-ink-700 rounded-lg shadow-panel z-50 p-4">
          {title && (
            <div className="font-serif text-sm font-semibold text-text-100 uppercase tracking-wide border-b border-ink-700 pb-2 mb-3">
              {title}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
};

