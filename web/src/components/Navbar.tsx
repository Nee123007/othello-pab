import React from 'react';
import { NavLink } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `h-full flex items-center text-[11px] sm:text-xs font-medium uppercase tracking-wider transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass-400 ${
      isActive
        ? 'border-brass-400 text-brass-400 font-semibold'
        : 'border-transparent text-text-400 hover:text-text-100 hover:border-ink-700'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-ink-950/95 backdrop-blur-md border-b border-ink-700/80 px-3.5 sm:px-8">
      <div className="max-w-7xl mx-auto h-14 flex items-center justify-between">
        {/* Brand Wordmark in Fraunces */}
        <NavLink
          to="/play"
          className="flex items-center gap-2 sm:gap-2.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass-400 rounded shrink-0"
        >
          <div className="flex items-center -space-x-1.5">
            <div className="w-5 h-5 rounded-full bg-obsidian border border-ink-700 shadow-sm" />
            <div className="w-5 h-5 rounded-full bg-pearl border border-brass-400/80 shadow-sm" />
          </div>
          <span className="font-serif text-base sm:text-lg font-bold tracking-tight text-text-100">
            Othello
          </span>
        </NavLink>

        {/* Navigation Items - full height flex without scrollbars */}
        <nav className="h-full flex items-center gap-2 sm:gap-5 md:gap-8">
          <NavLink to="/play" className={navLinkClass}>
            Play
          </NavLink>
          <NavLink to="/tree" className={navLinkClass}>
            Tree
          </NavLink>
          <NavLink to="/lab" className={navLinkClass}>
            Lab
          </NavLink>
          <NavLink to="/benchmarks" className={navLinkClass}>
            <span className="hidden sm:inline">Benchmarks</span>
            <span className="sm:hidden">Bench</span>
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            About
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

