import React from 'react';
import { NavLink } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-xs font-medium uppercase tracking-wider transition-colors py-1 border-b-2 -mb-[17px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass-400 ${
      isActive
        ? 'border-brass-400 text-brass-400 font-semibold'
        : 'border-transparent text-text-400 hover:text-text-100 hover:border-ink-700'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-ink-950/95 backdrop-blur-md border-b border-ink-700/80 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto h-14 flex items-center justify-between">
        {/* Brand Wordmark in Fraunces */}
        <NavLink
          to="/play"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass-400 rounded"
        >
          <div className="flex items-center -space-x-1.5">
            <div className="w-5 h-5 rounded-full bg-obsidian border border-ink-700 shadow-sm" />
            <div className="w-5 h-5 rounded-full bg-pearl border border-brass-400/80 shadow-sm" />
          </div>
          <span className="font-serif text-lg font-bold tracking-tight text-text-100">
            Ebon <span className="text-brass-400 font-light">&amp;</span> Ivory
          </span>
        </NavLink>

        {/* Navigation Items */}
        <nav className="flex items-center gap-3 sm:gap-6 md:gap-8 overflow-x-auto no-scrollbar py-2">
          <NavLink to="/play" className={navLinkClass}>
            Play
          </NavLink>
          <NavLink to="/lab" className={navLinkClass}>
            Lab
          </NavLink>
          <NavLink to="/benchmarks" className={navLinkClass}>
            Benchmarks
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            About
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

