import React, { useState, useEffect } from 'react';
import { GlobalNavbar, AppPage } from './components/navigation/GlobalNavbar';
import { CommandPalette } from './components/navigation/CommandPalette';
import { GlobalFooter } from './components/navigation/GlobalFooter';
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { EnginePage } from './pages/EnginePage';
import { CustomersPage } from './pages/CustomersPage';
import { SecurityPage } from './pages/SecurityPage';
import { PricingPage } from './pages/PricingPage';
import { DocsPage } from './pages/DocsPage';
import { Workspace } from './components/workspace/Workspace';

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<AppPage>(() => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    const validPages: AppPage[] = [
      'overview',
      'product',
      'engine',
      'customers',
      'security',
      'pricing',
      'docs',
      'studio',
    ];
    if (validPages.includes(hash as AppPage)) {
      return hash as AppPage;
    }
    return 'overview';
  });

  const [selectedSampleId, setSelectedSampleId] = useState<string | undefined>(undefined);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Sync theme to <html> element class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Sync URL hash changes (back/forward browser buttons)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const validPages: AppPage[] = [
        'overview',
        'product',
        'engine',
        'customers',
        'security',
        'pricing',
        'docs',
        'studio',
      ];
      if (validPages.includes(hash as AppPage)) {
        setActivePage(hash as AppPage);
      } else if (!hash) {
        setActivePage('overview');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (page: AppPage, sampleId?: string) => {
    setSelectedSampleId(sampleId);
    setActivePage(page);
    window.location.hash = page === 'overview' ? '' : page;
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleToggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  // Render full-viewport 4-Pane Studio IDE without outer website wrapper
  if (activePage === 'studio') {
    return (
      <div className="w-full h-screen overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)]">
        <Workspace
          initialDrawingId={selectedSampleId}
          darkMode={darkMode}
          onToggleTheme={handleToggleTheme}
          onExitToLanding={() => handleNavigate('overview')}
        />

        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onNavigate={handleNavigate}
          onToggleTheme={handleToggleTheme}
        />
      </div>
    );
  }

  // Render Marketing & Documentation Website
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] selection:bg-[var(--text-primary)] selection:text-[var(--bg-page)]">
      {/* 56px Sticky Minimalist Navbar */}
      <GlobalNavbar
        activePage={activePage}
        onNavigate={handleNavigate}
        darkMode={darkMode}
        onToggleTheme={handleToggleTheme}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {/* Main Page View */}
      <main className="flex-1">
        {activePage === 'overview' && (
          <HomePage
            onNavigate={handleNavigate}
            onStartTour={() => handleNavigate('studio')}
          />
        )}
        {activePage === 'product' && <ProductPage onNavigate={handleNavigate} />}
        {activePage === 'engine' && <EnginePage onNavigate={handleNavigate} />}
        {activePage === 'customers' && <CustomersPage onNavigate={handleNavigate} />}
        {activePage === 'security' && <SecurityPage onNavigate={handleNavigate} />}
        {activePage === 'pricing' && <PricingPage onNavigate={handleNavigate} />}
        {activePage === 'docs' && <DocsPage onNavigate={handleNavigate} />}
      </main>

      {/* 5-Column Swiss Minimalist Footer */}
      <GlobalFooter onNavigate={handleNavigate} />

      {/* Global Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
        onToggleTheme={handleToggleTheme}
      />
    </div>
  );
};

export default App;
