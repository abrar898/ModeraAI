import React, { useState } from 'react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';

export default function AppLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper dark:bg-dusk relative">
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-ink/40 dark:bg-black/60 z-30 md:hidden"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <Sidebar mobileOpen={menuOpen} onNavigate={() => setMenuOpen(false)} />

      <main className="md:ml-60 min-h-screen relative z-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-3 md:py-4 bg-paper/95 dark:bg-dusk/95 backdrop-blur-md border-b border-mist dark:border-dusk-line md:border-0 md:bg-transparent md:backdrop-blur-none md:static">
          <button
            type="button"
            className="md:hidden btn-secondary btn-sm !px-3 shrink-0"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            Menu
          </button>
          <div className="flex-1 md:hidden text-center font-display font-semibold text-sm text-ink dark:text-paper truncate">
            Modera<span className="text-signal">AI</span>
          </div>
          <div className="hidden md:block flex-1" aria-hidden="true" />
          <div className="shrink-0 ml-auto">
            <NotificationBell />
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 py-4 md:py-6 pb-10 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
