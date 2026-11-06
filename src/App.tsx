import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/landing/LandingPage';
import { Workspace } from './components/workspace/Workspace';

export const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'workspace'>('landing');
  const [selectedSampleId, setSelectedSampleId] = useState<string>('AS-4092-C');
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Initialize and sync theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleToggleTheme = () => {
    setDarkMode(prev => !prev);
  };

  const handleLaunchWorkspace = (sampleId?: string) => {
    if (sampleId) {
      setSelectedSampleId(sampleId);
    }
    setView('workspace');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleExitToLanding = () => {
    setView('landing');
  };

  return (
    <div className="w-full min-h-screen">
      {view === 'landing' ? (
        <LandingPage
          darkMode={darkMode}
          onToggleTheme={handleToggleTheme}
          onLaunchWorkspace={handleLaunchWorkspace}
        />
      ) : (
        <Workspace
          initialDrawingId={selectedSampleId}
          darkMode={darkMode}
          onToggleTheme={handleToggleTheme}
          onExitToLanding={handleExitToLanding}
        />
      )}
    </div>
  );
};

export default App;

