import React from 'react';
import styles from './KeyboardShortcuts.module.css';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkTheme: boolean;
}

interface Shortcut {
  key: string;
  description: string;
}

interface ShortcutGroups {
  [category: string]: Shortcut[];
}

const SHORTCUTS: ShortcutGroups = {
  'Text Editing': [
    { key: 'Ctrl + Z', description: 'Undo' },
    { key: 'Ctrl + Y', description: 'Redo' },
    { key: 'Ctrl + X', description: 'Cut' },
    { key: 'Ctrl + C', description: 'Copy' },
    { key: 'Ctrl + V', description: 'Paste' },
    { key: 'Ctrl + A', description: 'Select All' },
  ],
  'Document': [
    { key: 'Ctrl + S', description: 'Save to file' },
    { key: 'Ctrl + N', description: 'New entry' },
    { key: 'Ctrl + /', description: 'Show keyboard shortcuts' },
  ],
  'View': [
    { key: 'F11', description: 'Toggle fullscreen' },
    { key: 'Ctrl + Scroll', description: 'Adjust font size' },
    { key: 'Esc', description: 'Clear selection' },
  ],
};

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  isOpen,
  onClose,
  isDarkTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div 
        className={`${styles.dialog} ${isDarkTheme ? styles.darkTheme : styles.lightTheme}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2>Keyboard Shortcuts</h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
          >
            ×
          </button>
        </div>
        <div className={styles.content}>
          {Object.entries(SHORTCUTS).map(([category, shortcuts]) => (
            <div key={category} className={styles.category}>
              <h3>{category}</h3>
              <div className={styles.shortcuts}>
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className={styles.shortcut}>
                    <kbd className={styles.key}>{shortcut.key}</kbd>
                    <span className={styles.description}>{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts; 