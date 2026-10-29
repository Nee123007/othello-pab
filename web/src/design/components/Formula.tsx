import React, { useMemo } from 'react';
import katex from 'katex';

export interface FormulaProps {
  math: string;
  block?: boolean;
  className?: string;
}

export const Formula: React.FC<FormulaProps> = ({
  math,
  block = false,
  className = '',
}) => {
  const html = useMemo(() => {
    // Normalize double-escaped LaTeX commands in JSX (e.g. \\frac -> \frac)
    const normalized = math.replace(/\\\\([a-zA-Z]+)/g, (_, cmd) => '\\' + cmd);
    try {
      return katex.renderToString(normalized, {
        displayMode: block,
        throwOnError: false,
      });
    } catch {
      return math;
    }
  }, [math, block]);

  return (
    <span
      className={`inline-block text-text-100 font-mono ${block ? 'my-2 block text-center' : ''} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

