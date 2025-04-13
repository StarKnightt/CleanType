import React, { useState, useEffect, useCallback } from 'react';
import styles from './FullscreenEditor.module.css';
import HistoryPanel from './HistoryPanel';

const STORAGE_KEY = 'freewrite-content';
const FONT_STORAGE_KEY = 'freewrite-font';
const SIZE_STORAGE_KEY = 'freewrite-size';
const ENTRIES_KEY = 'freewrite-entries';
const THEME_KEY = 'freewrite-theme';

interface Entry {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  title: string;
}

type FontStyle = 'lato' | 'arial' | 'system' | 'serif' | 'random';
type Theme = 'dark' | 'light';

const FONT_LABELS: Record<FontStyle, string> = {
  lato: 'Lato',
  arial: 'Arial',
  system: 'System',
  serif: 'Serif',
  random: 'Default'
};

const SIZE_PRESETS = ['16', '18', '20', '24', '28'];

const FullscreenEditor: React.FC = () => {
  const [content, setContent] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || '';
  });

  const [currentEntry, setCurrentEntry] = useState<Entry | null>(() => {
    const savedContent = localStorage.getItem(STORAGE_KEY);
    if (savedContent) {
      return {
        id: 'current',
        content: savedContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: 'Untitled'
      };
    }
    return null;
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>(() => {
    return JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');
  });

  const [currentFont, setCurrentFont] = useState<FontStyle>(() => {
    return (localStorage.getItem(FONT_STORAGE_KEY) as FontStyle) || 'system';
  });

  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem(SIZE_STORAGE_KEY) || '24';
  });

  const [isMaximized, setIsMaximized] = useState(true);
  const [selectionStart, setSelectionStart] = useState<number>(0);
  const [selectionEnd, setSelectionEnd] = useState<number>(0);

  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    return localStorage.getItem(THEME_KEY) !== 'light';
  });

  // Load entries when component mounts
  useEffect(() => {
    const savedEntries = localStorage.getItem(ENTRIES_KEY);
    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    }
  }, []);

  const saveCurrentEntry = async () => {
    if (currentEntry && content.trim()) {
      const updatedEntry = {
        ...currentEntry,
        content,
        updatedAt: new Date().toISOString()
      };
      
      const newEntries = [...entries];
      const index = newEntries.findIndex(e => e.id === currentEntry.id);
      
      if (index >= 0) {
        newEntries[index] = updatedEntry;
      } else {
        newEntries.push(updatedEntry);
      }
      
      setEntries(newEntries);
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(newEntries));
      localStorage.setItem(STORAGE_KEY, content);
      setHasUnsavedChanges(false);
    }
  };

  // Auto-save content and entries
  useEffect(() => {
    const saveContent = () => {
      if (currentEntry) {
        localStorage.setItem(STORAGE_KEY, content);
        saveCurrentEntry();
      }
    };
    const timeoutId = setTimeout(saveContent, 300);
    return () => clearTimeout(timeoutId);
  }, [content, currentEntry]);

  // Track unsaved changes
  useEffect(() => {
    if (currentEntry && currentEntry.content !== content) {
      setHasUnsavedChanges(true);
    }
  }, [content, currentEntry]);

  // Save font preference
  useEffect(() => {
    localStorage.setItem(FONT_STORAGE_KEY, currentFont);
  }, [currentFont]);

  // Save font size
  useEffect(() => {
    localStorage.setItem(SIZE_STORAGE_KEY, fontSize);
  }, [fontSize]);

  const handleZoom = useCallback((e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const currentSize = parseInt(fontSize);
      const newSize = e.deltaY < 0 
        ? Math.min(currentSize + 2, 72)  // Zoom in (max 72px)
        : Math.max(currentSize - 2, 8);   // Zoom out (min 8px)
      setFontSize(newSize.toString());
    }
  }, [fontSize]);

  // Add wheel event listener for zoom
  useEffect(() => {
    document.addEventListener('wheel', handleZoom, { passive: false });
    return () => document.removeEventListener('wheel', handleZoom);
  }, [handleZoom]);

  const handleSelectEntry = (entry: Entry) => {
    if (hasUnsavedChanges) {
      const shouldSwitch = window.confirm(
        'You have unsaved changes. Would you like to save before switching entries?'
      );
      
      if (shouldSwitch) {
        saveCurrentEntry().then(() => {
          setCurrentEntry(entry);
          setContent(entry.content);
          setHasUnsavedChanges(false);
        });
      } else {
        setCurrentEntry(entry);
        setContent(entry.content);
        setHasUnsavedChanges(false);
      }
    } else {
      setCurrentEntry(entry);
      setContent(entry.content);
    }
  };

  const handleDeleteEntry = (entryToDelete: Entry) => {
    const newEntries = entries.filter(e => e.id !== entryToDelete.id);
    setEntries(newEntries);
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(newEntries));

    // Only create a new entry if we're deleting the current one
    if (currentEntry?.id === entryToDelete.id) {
      const newEntry: Entry = {
        id: Date.now().toString(),
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: 'Untitled'
      };
      setCurrentEntry(newEntry);
      setContent('');
      setHasUnsavedChanges(false);
      
      // Add the new entry to the list
      const updatedEntries = [...newEntries, newEntry];
      setEntries(updatedEntries);
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(updatedEntries));
    }
  };

  const toggleTheme = () => {
    setIsDarkTheme(prev => {
      const newTheme = !prev;
      localStorage.setItem(THEME_KEY, newTheme ? 'dark' : 'light');
      return newTheme;
    });
  };

  const createNewEntry = () => {
    const createEntry = () => {
      const newEntry: Entry = {
        id: Date.now().toString(),
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: 'Untitled'
      };
      setCurrentEntry(newEntry);
      setContent('');
      setHasUnsavedChanges(false);
      
      // Save the new entry immediately
      const newEntries = [...entries, newEntry];
      setEntries(newEntries);
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(newEntries));
    };

    if (hasUnsavedChanges && content.trim()) {
      const shouldSave = window.confirm(
        'You have unsaved changes. Would you like to save before creating a new entry?'
      );
      
      if (shouldSave) {
        saveCurrentEntry().then(createEntry);
      } else {
        createEntry();
      }
    } else {
      createEntry();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // New Document (Ctrl + N)
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      createNewEntry();
      return;
    }

    // Save (Ctrl + S)
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      // Will be handled by auto-save
      return;
    }

    // Select All (Ctrl + A)
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      textarea.select();
    }

    // Undo (Ctrl + Z)
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('undo');
    }

    // Redo (Ctrl + Y or Ctrl + Shift + Z)
    if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      document.execCommand('redo');
    }

    // Cut (Ctrl + X)
    if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
      const textarea = e.target as HTMLTextAreaElement;
      const selectedText = content.substring(textarea.selectionStart, textarea.selectionEnd);
      if (selectedText) {
        navigator.clipboard.writeText(selectedText);
        const newContent = 
          content.substring(0, textarea.selectionStart) + 
          content.substring(textarea.selectionEnd);
        setContent(newContent);
        e.preventDefault();
      }
    }

    // Copy (Ctrl + C)
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      const textarea = e.target as HTMLTextAreaElement;
      const selectedText = content.substring(textarea.selectionStart, textarea.selectionEnd);
      if (selectedText) {
        navigator.clipboard.writeText(selectedText);
        e.preventDefault();
      }
    }

    // Paste (Ctrl + V)
    if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
      e.preventDefault();
      navigator.clipboard.readText().then(clipText => {
        const textarea = e.target as HTMLTextAreaElement;
        const newContent = 
          content.substring(0, textarea.selectionStart) + 
          clipText + 
          content.substring(textarea.selectionEnd);
        setContent(newContent);
      });
    }

    // Find (Ctrl + F)
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      // We'll implement find functionality later
    }

    // Maximize/Minimize (F11)
    if (e.key === 'F11') {
      e.preventDefault();
      setIsMaximized(!isMaximized);
    }

    // Escape to clear selection
    if (e.key === 'Escape') {
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value && parseInt(value) > 0) {
      setFontSize(value);
    }
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    setSelectionStart(textarea.selectionStart);
    setSelectionEnd(textarea.selectionEnd);
  };

  return (
    <div className={`${styles.container} ${isDarkTheme ? styles.darkTheme : styles.lightTheme}`}>
      <div className={styles.bottomNav}>
        <div className={styles.leftControls}>
          <div className={styles.sizeWrapper}>
            <input
              type="text"
              value={fontSize + 'px'}
              onChange={handleSizeChange}
              className={styles.sizeInput}
            />
            <div className={styles.sizePresets}>
              {SIZE_PRESETS.map(size => (
                <button
                  key={size}
                  className={styles.sizePreset}
                  onClick={() => setFontSize(size)}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>
          <span className={styles.navDot}>•</span>
          {Object.entries(FONT_LABELS).map(([font, label]) => (
            <React.Fragment key={font}>
              <button
                className={`${styles.fontOption} ${currentFont === font ? styles.active : ''}`}
                onClick={() => setCurrentFont(font as FontStyle)}
              >
                {label}
              </button>
              <span className={styles.navDot}>•</span>
            </React.Fragment>
          ))}
        </div>

        <div className={styles.rightControls}>
          <button 
            className={styles.navButton}
            onClick={createNewEntry}
          >
            New Entry
          </button>
          <span className={styles.navDot}>•</span>
          <button 
            className={`${styles.navButton} ${isHistoryOpen ? styles.active : ''}`}
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          >
            History
          </button>
          <span className={styles.navDot}>•</span>
          <div className={styles.timer}>00:00</div>
          <span className={styles.navDot}>•</span>
          <button 
            className={styles.navButton}
            onClick={toggleTheme}
          >
            {isDarkTheme ? '☀️' : '🌙'}
          </button>
          <span className={styles.navDot}>•</span>
          <button 
            className={styles.navButton}
            onClick={() => setIsMaximized(!isMaximized)}
          >
            {isMaximized ? 'Minimize' : 'Maximize'}
          </button>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setHasUnsavedChanges(true);
        }}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
        className={`${styles.editor} ${styles[`font-${currentFont}`]}`}
        style={{ fontSize: `${fontSize}px` }}
        spellCheck={false}
        autoFocus
        placeholder="Start writing..."
      />

      <HistoryPanel
        isOpen={isHistoryOpen}
        entries={entries}
        currentEntry={currentEntry}
        onClose={() => setIsHistoryOpen(false)}
        onSelectEntry={handleSelectEntry}
        onDeleteEntry={handleDeleteEntry}
        isDarkTheme={isDarkTheme}
      />
    </div>
  );
};

export default FullscreenEditor; 