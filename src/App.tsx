import { useState, useEffect } from 'react';
import { FullscreenEditor } from "./components/FullscreenEditor";
import { ErrorBoundary } from "./components/ErrorBoundary";
import KeyboardShortcuts from './components/KeyboardShortcuts';
import styles from './App.module.css';
import './styles/theme.css';

function App() {
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const saved = localStorage.getItem('cleantype-theme');
    return saved !== 'light'; // Default to dark theme if not explicitly set to light
  });

  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Save theme changes to localStorage
  useEffect(() => {
    localStorage.setItem('cleantype-theme', isDarkTheme ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <ErrorBoundary>
      <div className={styles.app}>
        <FullscreenEditor 
          isDarkTheme={isDarkTheme}
          onThemeToggle={() => setIsDarkTheme(prev => !prev)}
        />
        <KeyboardShortcuts
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
          isDarkTheme={isDarkTheme}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;